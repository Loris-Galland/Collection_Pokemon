import type { ApplyChange, SyncedSource } from './synced-source.ts';

/** `unavailable` means the data could not be loaded. */
export type SyncedStatus = 'loading' | 'ready' | 'unavailable';

export interface SyncedState<S, F extends string> {
  status: SyncedStatus;
  /** What the screens show, including the changes still being kept. */
  value: S;
  /** What the source has kept. */
  saved: S;
  /** Why the last change could not be saved. It was undone, unless the session ended and it waits on the phone. */
  saveError: F | 'other' | undefined;
  /** Changes kept on the phone that the server does not have yet, for instance made without a network. */
  unsentCount: number;
}

export interface SyncedStore<S, C, F extends string> {
  subscribe: (listener: () => void) => () => void;
  getState: () => SyncedState<S, F>;
  load: () => Promise<void>;
  /** Sends the changes waiting on the phone, for instance when the network comes back. */
  sync: () => Promise<void>;
  /** Sends what waits, or reads the source again when nothing waits, since another phone may have changed it. */
  refresh: () => Promise<void>;
  /** Shows a change at once and keeps it. Returns false when it was refused before being kept. */
  change: (change: C) => boolean;
  dismissSaveError: () => void;
}

export interface SyncedStoreOptions<S, C, F extends string> {
  source: SyncedSource<S, C, F>;
  empty: S;
  applyChange: ApplyChange<S, C>;
  /** Why a change would break a limit, checked before it is shown, or undefined when it fits. */
  check?: (state: S, change: C) => F | undefined;
}

/**
 * Keeps some data in memory and hides its source from the screens. A change shows at once, so the screens stay quick,
 * and changes reach the source one at a time and in order. A change the source could not keep is undone, and one the
 * server refuses later makes the store read the source again.
 */
export function createSyncedStore<S, C, F extends string>(options: SyncedStoreOptions<S, C, F>): SyncedStore<S, C, F> {
  const { source, empty, applyChange, check } = options;
  let state: SyncedState<S, F> = {
    status: 'loading',
    value: empty,
    saved: empty,
    saveError: undefined,
    unsentCount: 0,
  };
  let loadInProgress: Promise<void> | undefined;
  let syncInProgress: Promise<void> | undefined;
  let syncAgain = false;
  let unsaved: C[] = [];
  let queue = Promise.resolve();
  const listeners = new Set<() => void>();

  const update = (patch: Partial<SyncedState<S, F>>) => {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  };

  async function runSync() {
    do {
      syncAgain = false;
      try {
        const { unsentCount, refused } = await source.sync();
        if (unsentCount !== state.unsentCount) update({ unsentCount });
        if (refused) {
          update({ saveError: refused });
          // A dropped change is still on screen, and only the server knows what the data is now.
          if (refused !== 'signed-out') await read();
        }
      } catch (error) {
        console.warn('Could not send the changes', error);
      }
    } while (syncAgain);
  }

  function sync() {
    if (syncInProgress) {
      // A change kept during this run is sent by the next one.
      syncAgain = true;
      return syncInProgress;
    }
    syncInProgress = runSync().finally(() => {
      syncInProgress = undefined;
    });
    return syncInProgress;
  }

  async function save(next: C) {
    try {
      await source.apply(next);
      unsaved = unsaved.slice(1);
      update({ saved: applyChange(state.saved, next) });
      sync();
    } catch (error) {
      console.warn('Could not save the change', error);
      unsaved = unsaved.slice(1);
      update({ value: unsaved.reduce(applyChange, state.saved), saveError: 'other' });
    }
  }

  async function read() {
    // A new load would wipe the changes still being kept.
    if (unsaved.length > 0) return;
    // Data already on screen stays there while it is read again, so the screens do not flash.
    const shown = state.status === 'ready';
    if (!shown) update({ status: 'loading' });
    try {
      const value = await source.load();
      if (unsaved.length > 0) return;
      update({ status: 'ready', value, saved: value });
      sync();
    } catch (error) {
      console.warn('Could not load the data', error);
      if (!shown) update({ status: 'unavailable' });
    }
  }

  function load() {
    loadInProgress ??= read().finally(() => {
      loadInProgress = undefined;
    });
    return loadInProgress;
  }

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getState: () => state,
    load,
    sync,
    refresh: () => (state.unsentCount > 0 ? sync() : load()),
    change: (next) => {
      if (state.status !== 'ready') return false;
      const limit = check?.(state.value, next);
      if (limit) {
        update({ saveError: limit });
        return false;
      }
      unsaved = [...unsaved, next];
      update({ value: applyChange(state.value, next), saveError: undefined });
      queue = queue.then(() => save(next));
      return true;
    },
    dismissSaveError: () => {
      if (state.saveError) update({ saveError: undefined });
    },
  };
}
