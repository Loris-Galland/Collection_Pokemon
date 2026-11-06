import {
  addWish,
  addWishlist,
  NO_WISHES,
  removeObtainedWishes,
  removeWish,
  removeWishlist,
  renameWishlist,
  restoreWishes,
  type Wish,
  type Wishes,
  type Wishlist,
} from '@collection/shared';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { wishlistKey } from '@/features/account/local-data';
import { useCollectionOwner, useSavedCopies } from '@/features/collection/collection-provider';
import { i18n } from '@/i18n';
import { createId } from '@/lib/id';
import { usePersistentState } from '@/lib/storage';

const NO_CARDS: ReadonlySet<string> = new Set();

// Wishes saved before lists existed go into a first list, named in the language of the app at that moment.
const restore = (value: unknown) => restoreWishes(value, i18n.t('wishlist.defaultName'), new Date().toISOString());

interface WishlistState {
  wishlists: readonly Wishlist[];
  wishes: readonly Wish[];
  /** Cards that left the lists during this session because they were obtained. */
  obtainedCardIds: ReadonlySet<string>;
  /** The wish for a card, undefined when the card is not wished. */
  wishOf: (cardId: string) => Wish | undefined;
  isWished: (cardId: string) => boolean;
  /** The list a new wish goes into, meaning the one used last, or the newest one. */
  defaultWishlist: Wishlist | undefined;
}

interface WishlistActions {
  /** Creates a list and returns its id. */
  createWishlist: (name: string) => string;
  renameWishlist: (wishlistId: string, name: string) => void;
  deleteWishlist: (wishlistId: string) => void;
  /** Puts a card in a list, moving it there when it is already in another one. */
  addWish: (cardId: string, setId: string, wishlistId: string) => void;
  removeWish: (cardId: string) => void;
}

// State and actions are split, as in the collection, because the actions never change.
const StateContext = createContext<WishlistState | null>(null);
const ActionsContext = createContext<WishlistActions | null>(null);

/** Loads the wishes of the account, saves them, and removes the cards that were added to the collection. */
export function WishlistProvider({ children }: { children: ReactNode }) {
  // Saved copies only, so a wish is not lost when adding the copy fails and is undone.
  const copies = useSavedCopies();
  // The owner of the collection, not the session, so the copies and the wishes always belong to the same account.
  const owner = useCollectionOwner();
  const [state, setState, loaded] = usePersistentState<Wishes>(wishlistKey(owner), NO_WISHES, restore);
  const [obtainedCardIds, setObtainedCardIds] = useState(NO_CARDS);
  const [lastUsedId, setLastUsedId] = useState<string>();

  // An owned card is no longer a wish. Once the wishes are loaded, and then whenever the collection changes, obtained
  // cards are removed. This adjusts state during render, as React recommends, instead of using an effect.
  const [checked, setChecked] = useState<{ copies: readonly unknown[]; owner: string | undefined }>();
  if (loaded && copies !== checked?.copies) {
    setChecked({ copies, owner });
    // Announcing only concerns changes made now, not the clean up on startup or after changing account.
    const announce = checked !== undefined && checked.owner === owner;
    if (!announce) setObtainedCardIds(NO_CARDS);
    const { state: remaining, obtained } = removeObtainedWishes(state, copies);
    if (obtained.length > 0) {
      setState(remaining);
      if (announce) setObtainedCardIds((current) => new Set([...current, ...obtained.map((w) => w.cardId)]));
    }
  }

  const value = useMemo<WishlistState>(() => {
    const byCard = new Map(state.wishes.map((wish) => [wish.cardId, wish]));
    const lastUsed = lastUsedId ?? state.wishes[0]?.wishlistId;
    return {
      wishlists: state.wishlists,
      wishes: state.wishes,
      obtainedCardIds,
      wishOf: (cardId) => byCard.get(cardId),
      isWished: (cardId) => byCard.has(cardId),
      defaultWishlist: state.wishlists.find((w) => w.id === lastUsed) ?? state.wishlists[0],
    };
  }, [state, obtainedCardIds, lastUsedId]);

  const actions = useMemo<WishlistActions>(
    () => ({
      createWishlist: (name) => {
        const id = createId();
        setState((current) => addWishlist(current, { id, name, createdAt: new Date().toISOString() }));
        setLastUsedId(id);
        return id;
      },
      renameWishlist: (wishlistId, name) => setState((current) => renameWishlist(current, wishlistId, name)),
      deleteWishlist: (wishlistId) => setState((current) => removeWishlist(current, wishlistId)),
      addWish: (cardId, setId, wishlistId) => {
        setState((current) => addWish(current, { cardId, setId, wishlistId, addedAt: new Date().toISOString() }));
        setLastUsedId(wishlistId);
      },
      removeWish: (cardId) => setState((current) => removeWish(current, cardId)),
    }),
    [setState],
  );

  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={value}>{children}</StateContext.Provider>
    </ActionsContext.Provider>
  );
}

/** The lists, the wishes and the cards obtained during this session. */
export function useWishlist(): WishlistState {
  const state = useContext(StateContext);
  if (!state) throw new Error('useWishlist must be used inside <WishlistProvider>');
  return state;
}

/** The actions on lists and wishes, stable until the account changes. */
export function useWishlistActions(): WishlistActions {
  const actions = useContext(ActionsContext);
  if (!actions) throw new Error('useWishlistActions must be used inside <WishlistProvider>');
  return actions;
}
