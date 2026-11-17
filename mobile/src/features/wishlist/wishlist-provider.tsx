import {
  NO_WISHES,
  applyWishlistChange,
  removeObtainedWishes,
  restoreWishes,
  wishlistLimitOf,
  type Wish,
  type WishlistChange,
  type Wishes,
  type Wishlist,
} from '@collection/shared';
import * as Network from 'expo-network';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { wishlistCacheKey, wishlistKey, wishlistOutboxKey } from '@/features/account/local-data';
import { requestWishes } from './wishlist-api';
import { useCollectionOwner, useSavedCopies } from '@/features/collection/collection-provider';
import { i18n } from '@/i18n';
import type { Stored } from '@/lib/change-queue';
import { createId } from '@/lib/id';
import { readJson, removeJson, writeJson } from '@/lib/storage';

import {
  createLocalWishlistSource,
  createServerWishlistSource,
  restoreQueuedWishChanges,
  type WishSaveFailure,
  type WishlistSource,
} from './wishlist-source';

const NO_CARDS: ReadonlySet<string> = new Set();

// Wishes saved before lists existed go into a first list, named in the language of the app at that moment.
const restore = (value: unknown) => restoreWishes(value, i18n.t('wishlist.defaultName'), new Date().toISOString());

function storedWishes(key: string): Stored<Wishes> {
  return {
    read: () => readJson<Wishes | undefined>(key, undefined, restore),
    write: (value) => writeJson(key, value),
    remove: () => removeJson([key]),
  };
}

/** A visitor keeps wishes on the phone, and an account keeps them on our server like its collection. */
function sourceFor(owner: string | undefined): WishlistSource {
  if (!owner) return createLocalWishlistSource(storedWishes(wishlistKey(undefined)));
  return createServerWishlistSource({
    request: requestWishes,
    cache: storedWishes(wishlistCacheKey(owner)),
    local: storedWishes(wishlistKey(owner)),
    outbox: {
      read: () => readJson(wishlistOutboxKey(owner), undefined, restoreQueuedWishChanges),
      write: (changes) => writeJson(wishlistOutboxKey(owner), changes),
      remove: () => removeJson([wishlistOutboxKey(owner)]),
    },
    newChangeId: createId,
  });
}

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

/** Loads the wishes of the account, sends their changes, and removes the cards that were added to the collection. */
export function WishlistProvider({ children }: { children: ReactNode }) {
  // Saved copies only, so a wish is not lost when adding the copy fails and is undone.
  const copies = useSavedCopies();
  // The owner of the collection, not the session, so the copies and the wishes always belong to the same account.
  const owner = useCollectionOwner();
  const [loaded, setLoaded] = useState<{ owner: string | undefined; source: WishlistSource; wishes: Wishes }>();
  const [obtainedCardIds, setObtainedCardIds] = useState(NO_CARDS);
  const [lastUsedId, setLastUsedId] = useState<string>();
  const [saveError, setSaveError] = useState<WishSaveFailure>();
  const [unsentCount, setUnsentCount] = useState(0);
  const stateRef = useRef<Wishes>(NO_WISHES);

  const current = loaded?.owner === owner ? loaded : undefined;
  const state = current?.wishes ?? NO_WISHES;
  // The actions check limits against the wishes on screen. They are read when the user acts, after this render.
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  const sync = useCallback(async (source: WishlistSource) => {
    const report = await source.sync().catch(() => undefined);
    if (!report) return;
    setUnsentCount(report.unsentCount);
    if (report.refused) {
      setSaveError(report.refused);
      // A refused change is still on screen, and only the server knows what the wishes are now.
      if (report.refused !== 'signed-out') {
        const wishes = await source.load().catch(() => undefined);
        if (wishes) setLoaded((now) => (now?.source === source ? { ...now, wishes } : now));
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const source = sourceFor(owner);
    source
      .load()
      .catch((error) => {
        console.warn('Could not load the wishes', error);
        return NO_WISHES;
      })
      .then((wishes) => {
        if (cancelled) return;
        setLoaded({ owner, source, wishes });
        sync(source);
      });
    return () => {
      cancelled = true;
    };
  }, [owner, sync]);

  // Sends what waits when the network comes back or the app returns, like the collection.
  useEffect(() => {
    if (!current) return;
    const { source } = current;
    const retry = () => sync(source);
    const network = Network.addNetworkStateListener((next) => {
      if (next.isInternetReachable) retry();
    });
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') retry();
    });
    return () => {
      network.remove();
      appState.remove();
    };
  }, [current, sync]);

  // An owned card is no longer a wish. Once the wishes are loaded, and then whenever the collection changes, obtained
  // cards are removed. This adjusts state during render, as React recommends, instead of using an effect.
  const [checked, setChecked] = useState<{ copies: readonly unknown[]; source: WishlistSource }>();
  if (current && (copies !== checked?.copies || current.source !== checked.source)) {
    setChecked({ copies, source: current.source });
    // Announcing only concerns changes made now, not the clean up on startup or after changing account.
    const announce = checked !== undefined && checked.source === current.source;
    if (!announce) setObtainedCardIds(NO_CARDS);
    const { state: remaining, obtained } = removeObtainedWishes(current.wishes, copies);
    if (obtained.length > 0) {
      setLoaded({ ...current, wishes: remaining });
      current.source
        .forgetObtained(remaining)
        .catch((error) => console.warn('Could not forget obtained wishes', error));
      if (announce) setObtainedCardIds((now) => new Set([...now, ...obtained.map((w) => w.cardId)]));
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
      saveError,
      unsentCount,
    };
  }, [state, obtainedCardIds, lastUsedId, saveError, unsentCount]);

  const source = current?.source;
  const actions = useMemo<WishlistActions>(() => {
    /** Shows a change at once, keeps it, and sends it. Returns false when it was refused before being kept. */
    const change = (next: WishlistChange): boolean => {
      if (!source) return false;
      const limit = wishlistLimitOf(stateRef.current, next);
      if (limit) {
        setSaveError(limit);
        return false;
      }
      setSaveError(undefined);
      setLoaded((now) => (now?.source === source ? { ...now, wishes: applyWishlistChange(now.wishes, next) } : now));
      source
        .apply(next)
        .then(() => sync(source))
        .catch((error) => {
          console.warn('Could not save the wishes', error);
          setSaveError('other');
          source.load().then(
            (wishes) => setLoaded((now) => (now?.source === source ? { ...now, wishes } : now)),
            () => undefined,
          );
        });
      return true;
    };
    return {
      createWishlist: (name) => {
        const id = createId();
        if (!change({ type: 'create-list', wishlist: { id, name, createdAt: new Date().toISOString() } }))
          return undefined;
        setLastUsedId(id);
        return id;
      },
      renameWishlist: (wishlistId, name) => void change({ type: 'rename-list', wishlistId, name }),
      deleteWishlist: (wishlistId) => void change({ type: 'remove-list', wishlistId }),
      addWish: (cardId, setId, wishlistId) => {
        if (change({ type: 'add-wish', wish: { cardId, setId, wishlistId, addedAt: new Date().toISOString() } })) {
          setLastUsedId(wishlistId);
        }
      },
      removeWish: (cardId) => void change({ type: 'remove-wish', cardId }),
      dismissSaveError: () => setSaveError(undefined),
    };
  }, [source, sync]);

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
