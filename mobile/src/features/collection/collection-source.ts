import type { CollectionChange, Copy } from '@collection/shared';

/** What a source returns on startup. */
export interface LoadedCollection {
  copies: Copy[];
}

/** What is left after the source tried to send the changes made offline. */
export interface SyncReport {
  /** Changes kept on the phone that the server does not have yet. */
  unsentCount: number;
  /** Why the server refused one of them, if it did. A refused change is dropped, except when the session has ended. */
  refused?: SaveFailure;
}

/** Where the collection is stored. Both methods reject when the source could not do the work. */
export interface CollectionSource {
  load(): Promise<LoadedCollection>;
  /** Keeps a change. A source with a server may only queue it, and `sync` sends it later. */
  apply(change: CollectionChange): Promise<void>;
  /** Sends the queued changes. A source without a server has nothing to send and leaves it out. */
  sync?(): Promise<SyncReport>;
}

/**
 * Why a change could not be saved. `full` means the collection holds the most copies allowed, and `signed-out` that
 * the session has ended.
 */
export type SaveFailure = 'full' | 'signed-out' | 'other';

/** The error a source rejects with when it knows why a change failed. */
export class CollectionSourceError extends Error {
  readonly reason: SaveFailure | 'offline';

  constructor(reason: SaveFailure | 'offline', options?: ErrorOptions) {
    super(`The collection could not be saved (${reason})`, options);
    this.reason = reason;
  }
}

export function saveFailureOf(error: unknown): SaveFailure {
  return error instanceof CollectionSourceError && error.reason !== 'offline' ? error.reason : 'other';
}
