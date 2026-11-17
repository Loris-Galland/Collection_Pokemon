import { countOwnedQuantities, type Copy } from '@collection/shared';
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { adoptLegacyData, collectionCacheKey, collectionKey, collectionOutboxKey } from '@/features/account/local-data';
import { useAccount } from '@/features/account/use-account';
import { createId } from '@/lib/id';
import type { SyncedState, SyncedStatus } from '@/lib/synced-store';
import { useRefreshOnReconnect } from '@/lib/use-refresh-on-reconnect';
import { StateView } from '@/ui';

import { requestCollection } from './collection-api';
import type { CollectionSource, SaveFailure } from './collection-source';
import { createCollectionStore, type CollectionActions, type CollectionStore } from './collection-store';
import { createLocalCollectionSource, storedCollectionChanges, storedCopies } from './local-collection-source';
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
function useSelected<T>(store: CollectionStore, select: (state: SyncedState<Copy[], SaveFailure>) => T): T {
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
    outbox: storedCollectionChanges(collectionOutboxKey(ownerId)),
    newChangeId: createId,
  });
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

  useRefreshOnReconnect(owned?.store);

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
  return useSelected(useStore(), (state) => state.value);
}

/** The copies the source has confirmed. A rule that must not act on a change that may be undone reads these. */
export function useSavedCopies(): readonly Copy[] {
  return useSelected(useStore(), (state) => state.saved);
}

/** Whether the collection is loaded. */
export function useCollectionStatus(): SyncedStatus {
  return useSelected(useStore(), (state) => state.status);
}

/** How many changes wait on the phone for the server. */
export function useUnsentCount(): number {
  return useSelected(useStore(), (state) => state.unsentCount);
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
