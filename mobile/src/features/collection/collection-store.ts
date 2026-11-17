import { applyCollectionChange, type CollectionChange, type Copy, type CopyInput } from '@collection/shared';

import { createSyncedStore, type SyncedStore } from '../../lib/synced-store.ts';
import type { CollectionSource, SaveFailure } from './collection-source.ts';

export interface CollectionActions {
  add: (input: CopyInput) => void;
  /** Adds several copies as one change, so a large selection saves and redraws only once. */
  addMany: (inputs: readonly CopyInput[]) => void;
  setQuantity: (copyId: string, quantity: number) => void;
  remove: (copyId: string) => void;
}

export type CollectionStore = SyncedStore<Copy[], CollectionChange, SaveFailure> & CollectionActions;

/** The collection in memory, with the actions the screens use. Each new copy gets its id here. */
export function createCollectionStore(source: CollectionSource, newId: () => string): CollectionStore {
  const store = createSyncedStore({ source, empty: [], applyChange: applyCollectionChange });
  const change = (next: CollectionChange) => void store.change(next);
  return {
    ...store,
    add: (input) => change({ type: 'add', id: newId(), input }),
    addMany: (inputs) => change({ type: 'add-many', entries: inputs.map((input) => ({ id: newId(), input })) }),
    setQuantity: (copyId, quantity) => change({ type: 'set-quantity', copyId, quantity }),
    remove: (copyId) => change({ type: 'remove', copyId }),
  };
}
