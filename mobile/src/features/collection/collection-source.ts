import type { CollectionChange, Copy } from '@collection/shared';

/** What a source returns on startup. A read-only collection can be viewed but not changed. */
export interface LoadedCollection {
  copies: Copy[];
  readOnly: boolean;
}

/** Where the collection is stored. Both methods reject when the source could not do the work. */
export interface CollectionSource {
  load(): Promise<LoadedCollection>;
  apply(change: CollectionChange): Promise<void>;
}

/**
 * Why a change could not be saved. `offline` means the server could not be reached, `full` that the collection holds
 * the most copies allowed, and `signed-out` that the session has ended.
 */
export type SaveFailure = 'offline' | 'full' | 'signed-out' | 'other';

/** The error a source rejects with when it knows why a change failed. */
export class CollectionSourceError extends Error {
  readonly reason: SaveFailure;

  constructor(reason: SaveFailure) {
    super(`The collection could not be saved (${reason})`);
    this.reason = reason;
  }
}

export function saveFailureOf(error: unknown): SaveFailure {
  return error instanceof CollectionSourceError ? error.reason : 'other';
}
