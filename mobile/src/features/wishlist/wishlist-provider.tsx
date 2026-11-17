import {
  MAX_WISHES_PER_IMPORT,
  NO_WISHES,
  applyWishlistChange,
  isWishlistChange,
  removeObtainedWishes,
  restoreWishes,
  wishlistLimitOf,
  type Copy,
  type Wish,
  type Wishes,
  type Wishlist,
} from '@collection/shared';
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';

import { wishlistCacheKey, wishlistKey, wishlistOutboxKey } from '@/features/account/local-data';
import { useCollectionOwner, useSavedCopies } from '@/features/collection/collection-provider';
import { i18n } from '@/i18n';
import { restoreQueue } from '@/lib/change-queue';
import { createId } from '@/lib/id';
import { storedJson } from '@/lib/storage';
import { createLocalSource } from '@/lib/synced-source';
import { createSyncedStore } from '@/lib/synced-store';
import { useRefreshOnReconnect } from '@/lib/use-refresh-on-reconnect';

import { requestWishes } from './wishlist-api';
import { createServerWishlistSource, type WishSaveFailure, type WishlistSource } from './wishlist-source';

const NO_CARDS: ReadonlySet<string> = new Set();

// Wishes saved before lists existed go into a first list, named in the language of the app at that moment.
const restore = (value: unknown) => restoreWishes(value, i18n.t('wishlist.defaultName'), new Date().toISOString());

/** A visitor keeps wishes on the phone, and an account keeps them on our server like its collection. */
function sourceFor(owner: string | undefined): WishlistSource {
  if (!owner) return createLocalSource(storedJson(wishlistKey(undefined), restore), NO_WISHES, applyWishlistChange);
  return createServerWishlistSource({
    request: requestWishes,
    cache: storedJson(wishlistCacheKey(owner), restore),
    local: storedJson(wishlistKey(owner), restore),
    outbox: storedJson(wishlistOutboxKey(owner), restoreQueue(isWishlistChange)),
    newChangeId: createId,
  });
}

const createWishlistStore = (owner: string | undefined) =>
  createSyncedStore({
    source: sourceFor(owner),
    empty: NO_WISHES,
    applyChange: applyWishlistChange,
    check: wishlistLimitOf,
  });

type WishlistStore = ReturnType<typeof createWishlistStore>;

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
  /** Why the last change was refused, if it was. */
  saveError: WishSaveFailure | undefined;
  /** Changes waiting on the phone for the server. */
  unsentCount: number;
}

interface WishlistActions {
  /** Creates a list and returns its id, or undefined when the account has as many lists as allowed. */
  createWishlist: (name: string) => string | undefined;
  renameWishlist: (wishlistId: string, name: string) => void;
  deleteWishlist: (wishlistId: string) => void;
  /** Puts a card in a list, moving it there when it is already in another one. */
  addWish: (cardId: string, setId: string, wishlistId: string) => void;
  removeWish: (cardId: string) => void;
  dismissSaveError: () => void;
}

// State and actions are split, as in the collection, because the actions never change.
const StateContext = createContext<WishlistState | null>(null);
const ActionsContext = createContext<WishlistActions | null>(null);

/** The cards of the wishes that the collection now holds. */
const obtainedIn = (wishes: Wishes, copies: readonly Copy[]) =>
  removeObtainedWishes(wishes, copies).obtained.map((wish) => wish.cardId);

/**
 * An owned card is no longer a wish. Whenever the collection changes, obtained cards leave the wishes like any other
 * change, so the phone and the server agree. The cards obtained during this session are kept to be announced.
 */
function useObtainedCards(store: WishlistStore, wishes: Wishes, ready: boolean): ReadonlySet<string> {
  // Saved copies only, so a wish is not lost when adding the copy fails and is undone.
  const copies = useSavedCopies();
  const [obtained, setObtained] = useState(NO_CARDS);
  const [checked, setChecked] = useState<{ copies: readonly Copy[]; store: WishlistStore }>();

  // Announcing only concerns changes made now, not the clean up on startup or after changing account. This adjusts
  // state during render, as React recommends, instead of using an effect.
  if (ready && (checked?.copies !== copies || checked.store !== store)) {
    setChecked({ copies, store });
    if (checked?.store !== store) setObtained(NO_CARDS);
    else {
      const cardIds = obtainedIn(wishes, copies);
      if (cardIds.length > 0) setObtained((now) => new Set([...now, ...cardIds]));
    }
  }

  useEffect(() => {
    if (!ready) return;
    const cardIds = obtainedIn(store.getState().value, copies);
    for (let start = 0; start < cardIds.length; start += MAX_WISHES_PER_IMPORT) {
      store.change({ type: 'remove-wishes', cardIds: cardIds.slice(start, start + MAX_WISHES_PER_IMPORT) });
    }
  }, [store, copies, ready]);

  return obtained;
}

/** Loads the wishes of the account, sends their changes, and removes the cards that were added to the collection. */
export function WishlistProvider({ children }: { children: ReactNode }) {
  // The owner of the collection, not the session, so the copies and the wishes always belong to the same account.
  const owner = useCollectionOwner();
  const store = useMemo(() => createWishlistStore(owner), [owner]);
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const [lastUsedId, setLastUsedId] = useState<string>();

  useEffect(() => {
    store.load();
  }, [store]);
  useRefreshOnReconnect(store);

  const wishes = state.value;
  const obtainedCardIds = useObtainedCards(store, wishes, state.status === 'ready');

  const value = useMemo<WishlistState>(() => {
    const byCard = new Map(wishes.wishes.map((wish) => [wish.cardId, wish]));
    const lastUsed = lastUsedId ?? wishes.wishes[0]?.wishlistId;
    return {
      wishlists: wishes.wishlists,
      wishes: wishes.wishes,
      obtainedCardIds,
      wishOf: (cardId) => byCard.get(cardId),
      isWished: (cardId) => byCard.has(cardId),
      defaultWishlist: wishes.wishlists.find((w) => w.id === lastUsed) ?? wishes.wishlists[0],
      saveError: state.saveError,
      unsentCount: state.unsentCount,
    };
  }, [wishes, obtainedCardIds, lastUsedId, state.saveError, state.unsentCount]);

  const actions = useMemo<WishlistActions>(
    () => ({
      createWishlist: (name) => {
        const id = createId();
        if (!store.change({ type: 'create-list', wishlist: { id, name, createdAt: new Date().toISOString() } })) {
          return undefined;
        }
        setLastUsedId(id);
        return id;
      },
      renameWishlist: (wishlistId, name) => void store.change({ type: 'rename-list', wishlistId, name }),
      deleteWishlist: (wishlistId) => void store.change({ type: 'remove-list', wishlistId }),
      addWish: (cardId, setId, wishlistId) => {
        const wish = { cardId, setId, wishlistId, addedAt: new Date().toISOString() };
        if (store.change({ type: 'add-wish', wish })) setLastUsedId(wishlistId);
      },
      removeWish: (cardId) => void store.change({ type: 'remove-wishes', cardIds: [cardId] }),
      dismissSaveError: store.dismissSaveError,
    }),
    [store],
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
