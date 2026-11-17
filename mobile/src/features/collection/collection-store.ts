import { applyCollectionChange, type CollectionChange, type Copy, type CopyInput } from '@collection/shared';

import { saveFailureOf, type CollectionSource, type SaveFailure } from './collection-source.ts';

/** `unavailable` means the collection could not be loaded. */
export type CollectionStatus = 'loading' | 'ready' | 'unavailable';

export interface CollectionState {
  status: CollectionStatus;
  /** What the screens show, including the changes still being saved. */
  copies: readonly Copy[];
  /** What the source has kept. */
  savedCopies: readonly Copy[];
  /** Why the last change could not be saved. It was undone, unless the session ended and it waits on the phone. */
  saveError: SaveFailure | undefined;
  /** Changes kept on the phone that the server does not have yet, for instance made without a network. */
  unsentCount: number;
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
  /** Sends the changes waiting on the phone, for instance when the network comes back. */
  sync: () => Promise<void>;
  dismissSaveError: () => void;
}

const NOTHING: readonly Copy[] = [];

/**
 * Keeps the collection in memory and hides its source from the screens. A change shows at once, so the stepper stays
 * quick, and changes reach the source one at a time and in order. A change the source could not keep is undone.
 */
export function createCollectionStore(source: CollectionSource, newId: () => string): CollectionStore {
  let state: CollectionState = {
    status: 'loading',
    copies: NOTHING,
    savedCopies: NOTHING,
    saveError: undefined,
    unsentCount: 0,
  };
  let loadInProgress: Promise<void> | undefined;
  let syncInProgress: Promise<void> | undefined;
  let syncAgain = false;
  let unsaved: CollectionChange[] = [];
  let queue = Promise.resolve();
  const listeners = new Set<() => void>();

  const update = (patch: Partial<CollectionState>) => {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  };

  const runSync = async () => {
    if (!source.sync) return;
    do {
      syncAgain = false;
      try {
        const { unsentCount, refused } = await source.sync();
        if (unsentCount !== state.unsentCount) update({ unsentCount });
        if (refused) {
          update({ saveError: refused });
          // A dropped change is still on screen, and only the server knows what the collection is now.
          if (refused !== 'signed-out') await read();
        }
      } catch (error) {
        console.warn('Could not send the collection', error);
      }
    } while (syncAgain);
  };

  const sync = () => {
    if (syncInProgress) {
      // A change kept during this run is sent by the next one.
      syncAgain = true;
      return syncInProgress;
    }
    syncInProgress = runSync().finally(() => {
      syncInProgress = undefined;
    });
    return syncInProgress;
  };

  const save = async (change: CollectionChange) => {
    try {
      await source.apply(change);
      unsaved = unsaved.slice(1);
      update({ savedCopies: applyCollectionChange(state.savedCopies, change) });
      sync();
    } catch (error) {
      console.warn('Could not save the collection', error);
      unsaved = unsaved.slice(1);
      update({ copies: unsaved.reduce(applyCollectionChange, state.savedCopies), saveError: saveFailureOf(error) });
    }
  };

  const change = (next: CollectionChange) => {
    if (state.status !== 'ready') return;
    unsaved = [...unsaved, next];
    update({ copies: applyCollectionChange(state.copies, next), saveError: undefined });
    queue = queue.then(() => save(next));
  };

  async function read() {
    // A new load would wipe the changes still being saved.
    if (unsaved.length > 0) return;
    // A collection already on screen stays there while it is read again, so the screens do not flash.
    const shown = state.status === 'ready';
    if (!shown) update({ status: 'loading' });
    try {
      const { copies } = await source.load();
      if (unsaved.length > 0) return;
      update({ status: 'ready', copies, savedCopies: copies });
      sync();
    } catch (error) {
      console.warn('Could not load the collection', error);
      if (!shown) update({ status: 'unavailable' });
    }
  }

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
    sync,
    dismissSaveError: () => {
      if (state.saveError) update({ saveError: undefined });
    },
    add: (input) => change({ type: 'add', id: newId(), input }),
    addMany: (inputs) => change({ type: 'add-many', entries: inputs.map((input) => ({ id: newId(), input })) }),
    setQuantity: (copyId, quantity) => change({ type: 'set-quantity', copyId, quantity }),
    remove: (copyId) => change({ type: 'remove', copyId }),
  };
}
