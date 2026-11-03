import { addWish, isWish, removeObtainedWishes, removeWish, type Wishlist } from '@collection/shared';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { wishlistKey } from '@/features/account/local-data';
import { useCollectionOwner, useSavedCopies } from '@/features/collection/collection-provider';
import { usePersistentState } from '@/lib/storage';

const NO_WISHES: Wishlist = [];
const NO_CARDS: ReadonlySet<string> = new Set();

// Keeps the valid wishes only, so one corrupted entry does not cost the whole list.
const restoreWishlist = (value: unknown): Wishlist | undefined =>
  Array.isArray(value) ? value.filter(isWish) : undefined;

interface WishlistState {
  wishlist: Wishlist;
  /** Cards that left the list during this session because they were obtained. */
  obtainedCardIds: ReadonlySet<string>;
  isWished: (cardId: string) => boolean;
}

interface WishlistActions {
  toggle: (cardId: string, setId: string) => void;
}

// State and actions are split, as in the collection, because the actions never change.
const StateContext = createContext<WishlistState | null>(null);
const ActionsContext = createContext<WishlistActions | null>(null);

/** Loads the wishlist of the account, saves it, and removes the cards that were added to the collection. */
export function WishlistProvider({ children }: { children: ReactNode }) {
  // Saved copies only, so a wish is not lost when adding the copy fails and is undone.
  const copies = useSavedCopies();
  // The owner of the collection, not the session, so the copies and the wishes always belong to the same account.
  const owner = useCollectionOwner();
  const [wishlist, setWishlist, loaded] = usePersistentState<Wishlist>(wishlistKey(owner), NO_WISHES, restoreWishlist);
  const [obtainedCardIds, setObtainedCardIds] = useState(NO_CARDS);

  // An owned card is no longer a wish. Once the list is loaded, and then whenever the collection changes, obtained
  // cards are removed. This adjusts state during render, as React recommends, instead of using an effect.
  const [checked, setChecked] = useState<{ copies: readonly unknown[]; owner: string | undefined }>();
  if (loaded && copies !== checked?.copies) {
    setChecked({ copies, owner });
    // Announcing only concerns changes made now, not the clean up on startup or after changing account.
    const announce = checked !== undefined && checked.owner === owner;
    if (!announce) setObtainedCardIds(NO_CARDS);
    const { wishlist: remaining, obtained } = removeObtainedWishes(wishlist, copies);
    if (obtained.length > 0) {
      setWishlist(remaining);
      if (announce) setObtainedCardIds((current) => new Set([...current, ...obtained.map((w) => w.cardId)]));
    }
  }

  const state = useMemo<WishlistState>(() => {
    const wishedIds = new Set(wishlist.map((wish) => wish.cardId));
    return { wishlist, obtainedCardIds, isWished: (cardId) => wishedIds.has(cardId) };
  }, [wishlist, obtainedCardIds]);

  const actions = useMemo<WishlistActions>(
    () => ({
      toggle: (cardId, setId) =>
        setWishlist((current) =>
          current.some((wish) => wish.cardId === cardId)
            ? removeWish(current, cardId)
            : addWish(current, { cardId, setId, addedAt: new Date().toISOString() }),
        ),
    }),
    [setWishlist],
  );

  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </ActionsContext.Provider>
  );
}

/** The wishlist and the cards obtained during this session. */
export function useWishlist(): WishlistState {
  const state = useContext(StateContext);
  if (!state) throw new Error('useWishlist must be used inside <WishlistProvider>');
  return state;
}

/** The add or remove wish action, stable until the account changes. */
export function useWishlistActions(): WishlistActions {
  const actions = useContext(ActionsContext);
  if (!actions) throw new Error('useWishlistActions must be used inside <WishlistProvider>');
  return actions;
}
