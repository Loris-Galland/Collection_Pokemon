import { countOwnedQuantities, type Copy } from '@collection/shared';
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';

import { createId } from '@/lib/id';
import { StateView } from '@/ui';

import { createLocalCollectionSource } from './collection-source';
import {
  createCollectionStore,
  type CollectionActions,
  type CollectionState,
  type CollectionStatus,
  type CollectionStore,
} from './collection-store';

const StoreContext = createContext<CollectionStore | null>(null);

function useStore(): CollectionStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('Collection hooks must be used inside <CollectionProvider>');
  return store;
}

/** Redraws the component only when the selected part of the state changes. */
function useSelected<T>(store: CollectionStore, select: (state: CollectionState) => T): T {
  const read = () => select(store.getState());
  return useSyncExternalStore(store.subscribe, read, read);
}

/** Loads the collection on startup and gives it to the screens. */
export function CollectionProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createCollectionStore(createLocalCollectionSource(), createId));
  const status = useSelected(store, (state) => state.status);

  useEffect(() => {
    store.load();
  }, [store]);

  if (status === 'loading') return null;
  if (status === 'unavailable') {
    return (
      <StateView
        title="Collection indisponible"
        message="Ta collection n’a pas pu être chargée. Vérifie ta connexion, puis réessaie."
        actionLabel="Réessayer"
        onAction={store.load}
      />
    );
  }
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
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

/** Whether the last change could not be saved, and how to clear that message. */
export function useCollectionSaveError(): { saveFailed: boolean; dismiss: () => void } {
  const store = useStore();
  const saveFailed = useSelected(store, (state) => state.saveFailed);
  return { saveFailed, dismiss: store.dismissSaveError };
}

/** The add, edit and remove actions, stable across renders. */
export function useCollectionActions(): CollectionActions {
  return useStore();
}

/** Total owned quantity per card, across every variant, language and condition. */
export function useOwnedQuantities(): Map<string, number> {
  const copies = useCopies();
  return useMemo(() => countOwnedQuantities(copies), [copies]);
}
