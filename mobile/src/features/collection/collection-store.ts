import { applyCollectionChange, type CollectionChange, type Copy, type CopyInput } from '@collection/shared';

import type { CollectionSource } from './collection-source';

/** `unavailable` means the collection could not be loaded, and `read-only` that it can be viewed but not changed. */
export type CollectionStatus = 'loading' | 'ready' | 'read-only' | 'unavailable';

export interface CollectionState {
  status: CollectionStatus;
  /** What the screens show, including the changes still being saved. */
  copies: readonly Copy[];
  /** What the source has confirmed. */
  savedCopies: readonly Copy[];
  /** The last change could not be saved and was undone. */
  saveFailed: boolean;
}

export interface CollectionActions {
  add: (input: CopyInput) => void;
  setQuantity: (copyId: string, quantity: number) => void;
  remove: (copyId: string) => void;
}

export interface CollectionStore extends CollectionActions {
  subscribe: (listener: () => void) => () => void;
  getState: () => CollectionState;
  load: () => Promise<void>;
  dismissSaveError: () => void;
}

const NOTHING: readonly Copy[] = [];

/**
 * Keeps the collection in memory and hides its source from the screens. A change shows at once, so the stepper stays
 * quick, and changes reach the source one at a time and in order. A change the source refuses is undone.
 */
export function createCollectionStore(source: CollectionSource, newId: () => string): CollectionStore {
  let state: CollectionState = { status: 'loading', copies: NOTHING, savedCopies: NOTHING, saveFailed: false };
  let loadInProgress: Promise<void> | undefined;
  let unsaved: CollectionChange[] = [];
  let queue = Promise.resolve();
  const listeners = new Set<() => void>();

  const update = (patch: Partial<CollectionState>) => {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  };

  const save = async (change: CollectionChange) => {
    try {
      await source.apply(change);
      unsaved = unsaved.slice(1);
      update({ savedCopies: applyCollectionChange(state.savedCopies, change) });
    } catch (error) {
      console.warn('Could not save the collection', error);
      unsaved = unsaved.slice(1);
      update({ copies: unsaved.reduce(applyCollectionChange, state.savedCopies), saveFailed: true });
    }
  };

  const change = (next: CollectionChange) => {
    if (state.status !== 'ready') return;
    unsaved = [...unsaved, next];
    update({ copies: applyCollectionChange(state.copies, next), saveFailed: false });
    queue = queue.then(() => save(next));
  };

  const read = async () => {
    update({ status: 'loading' });
    try {
      const { copies, readOnly } = await source.load();
      update({ status: readOnly ? 'read-only' : 'ready', copies, savedCopies: copies });
    } catch (error) {
      console.warn('Could not load the collection', error);
      update({ status: 'unavailable' });
    }
  };

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getState: () => state,
    load: () => {
      loadInProgress ??= read().finally(() => {
        loadInProgress = undefined;
      });
      return loadInProgress;
    },
    dismissSaveError: () => {
      if (state.saveFailed) update({ saveFailed: false });
    },
    add: (input) => change({ type: 'add', id: newId(), input }),
    setQuantity: (copyId, quantity) => change({ type: 'set-quantity', copyId, quantity }),
    remove: (copyId) => change({ type: 'remove', copyId }),
  };
}
