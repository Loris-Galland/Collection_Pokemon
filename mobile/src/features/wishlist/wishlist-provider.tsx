import { addWish, isWish, removeObtainedWishes, removeWish, type Wishlist } from '@collection/shared';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { useSavedCopies } from '@/features/collection/collection-provider';
import { usePersistentState } from '@/lib/storage';

// Like the collection, the wishlist lives on the phone during the prototype.
const STORAGE_KEY = 'wishlist/v1';

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

/** Loads the wishlist, saves it, and removes the cards that were added to the collection. */
export function WishlistProvider({ children }: { children: ReactNode }) {
  // Saved copies only, so a wish is not lost when adding the copy fails and is undone.
  const copies = useSavedCopies();
  const [wishlist, setWishlist, loaded] = usePersistentState<Wishlist>(STORAGE_KEY, [], restoreWishlist);
  const [obtainedCardIds, setObtainedCardIds] = useState<ReadonlySet<string>>(new Set());

  // An owned card is no longer a wish. Once the list is loaded, and then whenever the collection changes, obtained
  // cards are removed. This adjusts state during render, as React recommends, instead of using an effect.
  const [checkedCopies, setCheckedCopies] = useState<readonly unknown[]>();
  if (loaded && copies !== checkedCopies) {
    setCheckedCopies(copies);
    const { wishlist: remaining, obtained } = removeObtainedWishes(wishlist, copies);
    if (obtained.length > 0) {
      setWishlist(remaining);
      // On startup we clean up silently, because the announcement only concerns the current session.
      if (checkedCopies) setObtainedCardIds((current) => new Set([...current, ...obtained.map((w) => w.cardId)]));
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

  if (!loaded) return null;
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

/** The add or remove wish action, stable across renders. */
export function useWishlistActions(): WishlistActions {
  const actions = useContext(ActionsContext);
  if (!actions) throw new Error('useWishlistActions must be used inside <WishlistProvider>');
  return actions;
}
