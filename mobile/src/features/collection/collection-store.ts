import { applyCollectionChange, type CollectionChange, type Copy, type CopyInput } from '@collection/shared';

import { saveFailureOf, type CollectionSource, type SaveFailure } from './collection-source.ts';

/** `unavailable` means the collection could not be loaded, and `read-only` that it can be viewed but not changed. */
export type CollectionStatus = 'loading' | 'ready' | 'read-only' | 'unavailable';

export interface CollectionState {
  status: CollectionStatus;
  /** What the screens show, including the changes still being saved. */
  copies: readonly Copy[];
  /** What the source has confirmed. */
  savedCopies: readonly Copy[];
  /** Why the last change could not be saved. It was undone. */
  saveError: SaveFailure | undefined;
}

export interface CollectionActions {
  add: (input: CopyInput) => void;
  /** Adds several copies as one change, so a large selection saves and redraws only once. */
  addMany: (inputs: readonly CopyInput[]) => void;
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
 * quick, and changes reach the source one at a time and in order. A change the source could not save is undone, and
 * the collection becomes read-only when the network is gone.
 */
export function createCollectionStore(source: CollectionSource, newId: () => string): CollectionStore {
  let state: CollectionState = { status: 'loading', copies: NOTHING, savedCopies: NOTHING, saveError: undefined };
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
      const saveError = saveFailureOf(error);
      update({
        copies: unsaved.reduce(applyCollectionChange, state.savedCopies),
        saveError,
        // Without a network the next changes would fail too, so the collection can only be viewed until it comes back.
        ...(saveError === 'offline' ? { status: 'read-only' as const } : {}),
      });
    }
  };

  const change = (next: CollectionChange) => {
    if (state.status !== 'ready') return;
    unsaved = [...unsaved, next];
    update({ copies: applyCollectionChange(state.copies, next), saveError: undefined });
    queue = queue.then(() => save(next));
  };

  const read = async () => {
    // A new load would wipe the changes still being saved.
    if (unsaved.length > 0) return;
    // A collection already on screen stays there while it is read again, so the screens do not flash.
    const shown = state.status === 'ready' || state.status === 'read-only';
    if (!shown) update({ status: 'loading' });
    try {
      const { copies, readOnly } = await source.load();
      if (unsaved.length > 0) return;
      update({ status: readOnly ? 'read-only' : 'ready', copies, savedCopies: copies });
    } catch (error) {
      console.warn('Could not load the collection', error);
      if (!shown) update({ status: 'unavailable' });
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
      if (state.saveError) update({ saveError: undefined });
    },
    add: (input) => change({ type: 'add', id: newId(), input }),
    addMany: (inputs) => change({ type: 'add-many', entries: inputs.map((input) => ({ id: newId(), input })) }),
    setQuantity: (copyId, quantity) => change({ type: 'set-quantity', copyId, quantity }),
    remove: (copyId) => change({ type: 'remove', copyId }),
  };
}
