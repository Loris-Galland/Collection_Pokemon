import type { CollectionChange, Copy } from '@collection/shared';

import type { SyncedSource } from '../../lib/synced-source.ts';

/**
 * Why a change could not be saved. `full` means the collection holds the most copies allowed, and `signed-out` that
 * the session has ended.
 */
export type SaveFailure = 'full' | 'signed-out' | 'other';

/** Where the collection is stored, on the phone for a visitor and on our server for an account. */
export type CollectionSource = SyncedSource<Copy[], CollectionChange, SaveFailure>;
