import { countOwnedQuantities, type Copy } from '@collection/shared';
import * as Network from 'expo-network';
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';

import { adoptLegacyData, collectionCacheKey, collectionKey } from '@/features/account/local-data';
import { useAccount } from '@/features/account/use-account';
import { createId } from '@/lib/id';
import { StateView } from '@/ui';

import { requestCollection } from './collection-api';
import type { CollectionSource, SaveFailure } from './collection-source';
import {
  createCollectionStore,
  type CollectionActions,
  type CollectionState,
  type CollectionStatus,
  type CollectionStore,
} from './collection-store';
import { createLocalCollectionSource, storedCopies } from './local-collection-source';
import { createServerCollectionSource } from './server-collection-source';

interface OwnedStore {
  store: CollectionStore;
  /** The account the collection belongs to, undefined for a visitor. */
  ownerId: string | undefined;
}

const StoreContext = createContext<OwnedStore | null>(null);

function useOwnedStore(): OwnedStore {
  const owned = useContext(StoreContext);
  if (!owned) throw new Error('Collection hooks must be used inside <CollectionProvider>');
  return owned;
}

function useStore(): CollectionStore {
  return useOwnedStore().store;
}

/** Redraws the component only when the selected part of the state changes. */
function useSelected<T>(store: CollectionStore, select: (state: CollectionState) => T): T {
  const read = () => select(store.getState());
  return useSyncExternalStore(store.subscribe, read, read);
}

/** A signed in account keeps its collection on our server. A visitor has nothing to send there. */
function sourceFor(ownerId: string | undefined): CollectionSource {
  if (!ownerId) return createLocalCollectionSource(collectionKey(undefined));
  return createServerCollectionSource({
    request: requestCollection,
    cache: storedCopies(collectionCacheKey(ownerId)),
    local: storedCopies(collectionKey(ownerId)),
    newChangeId: createId,
  });
}

/** Reads a read-only collection again when the network comes back or the app returns to the screen. */
function useReconnect(store: CollectionStore | undefined): void {
  useEffect(() => {
    if (!store) return;
    const retry = () => {
      if (store.getState().status === 'read-only') store.load();
    };
    const network = Network.addNetworkStateListener((state) => {
      if (state.isInternetReachable) retry();
    });
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') retry();
    });
    return () => {
      network.remove();
      appState.remove();
    };
  }, [store]);
}

/**
 * Gives the screens the collection of the signed in account. The next collection is loaded before it replaces the
 * current one, so the screens stay mounted and navigation is not lost when someone signs in.
 */
export function CollectionProvider({ children }: { children: ReactNode }) {
  const ownerId = useAccount().user?.id;
  const [owned, setOwned] = useState<OwnedStore>();

  useEffect(() => {
    let cancelled = false;
    const store = createCollectionStore(sourceFor(ownerId), createId);
    const open = async () => {
      if (ownerId) await adoptLegacyData(ownerId).catch((error) => console.warn('Could not move old data', error));
      await store.load();
      if (!cancelled) setOwned({ store, ownerId });
    };
    open();
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  useReconnect(owned?.store);

  // Only on the very first load. Later the current collection stays on screen until the next one is ready.
  if (!owned) return <StateView loading />;
  return (
    <StoreContext.Provider value={owned}>
      <AvailableCollection store={owned.store}>{children}</AvailableCollection>
    </StoreContext.Provider>
  );
}

function AvailableCollection({ store, children }: { store: CollectionStore; children: ReactNode }) {
  const { t } = useTranslation();
  const status = useSelected(store, (state) => state.status);
  if (status === 'unavailable') {
    return (
      <StateView
        title={t('collection.unavailable')}
        message={t('collection.loadFailed')}
        actionLabel={t('common.retry')}
        onAction={store.load}
      />
    );
  }
  return children;
}

/** The account the current collection belongs to, undefined for a visitor. It changes together with the copies. */
export function useCollectionOwner(): string | undefined {
  return useOwnedStore().ownerId;
}

/** The copies in the collection, as shown on screen. */
export function useCopies(): readonly Copy[] {
  return useSelected(useStore(), (state) => state.copies);
}

/** The copies the source has confirmed. A rule that must not act on a change that may be undone reads these. */
export function useSavedCopies(): readonly Copy[] {
  return useSelected(useStore(), (state) => state.savedCopies);
}

/** Whether the collection can be changed. */
export function useCollectionStatus(): CollectionStatus {
  return useSelected(useStore(), (state) => state.status);
}

/** Why the last change could not be saved, if it could not, and how to clear that message. */
export function useCollectionSaveError(): { saveError: SaveFailure | undefined; dismiss: () => void } {
  const store = useStore();
  const saveError = useSelected(store, (state) => state.saveError);
  return { saveError, dismiss: store.dismissSaveError };
}

/** The add, edit and remove actions, stable until the account changes. */
export function useCollectionActions(): CollectionActions {
  return useStore();
}

/** Total owned quantity per card, across every variant, language and condition. */
export function useOwnedQuantities(): Map<string, number> {
  const copies = useCopies();
  return useMemo(() => countOwnedQuantities(copies), [copies]);
}
