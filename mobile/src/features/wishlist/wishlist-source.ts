import {
  MAX_ID_LENGTH,
  MAX_WISHES_PER_IMPORT,
  applyWishlistChange,
  restoreWishes,
  type WishlistChange,
  type Wishes,
} from '@collection/shared';

import type { QueuedChange, ServerRequest, Stored } from '../../lib/change-queue.ts';
import { createServerSource, type SyncedSource, type UploadBatch } from '../../lib/synced-source.ts';

/** Why a wish change could not be kept. */
export type WishSaveFailure = 'too-many-wishes' | 'too-many-lists' | 'signed-out' | 'other';

export type WishlistSource = SyncedSource<Wishes, WishlistChange, WishSaveFailure>;

async function refusalOf(response: Response): Promise<'too-many-wishes' | 'too-many-lists' | 'other'> {
  if (response.status !== 409) return 'other';
  const body = (await response.json().catch(() => undefined)) as { error?: unknown } | undefined;
  if (body?.error === 'too_many_wishes') return 'too-many-wishes';
  if (body?.error === 'too_many_wishlists') return 'too-many-lists';
  return 'other';
}

/** A change id that stays the same for the same batch, made only of the characters a change id allows. */
const importId = (key: string) => `import-${key}`.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, MAX_ID_LENGTH);

/**
 * Splits saved wishes into imports of the size the server accepts. The lists go with the first batch, so every wish
 * finds its list. The id of a batch comes from its content, so a batch sent again keeps its change id.
 */
function importBatches(saved: Wishes): UploadBatch<Wishes, WishlistChange>[] {
  const batches: UploadBatch<Wishes, WishlistChange>[] = [];
  for (let start = 0; start === 0 || start < saved.wishes.length; start += MAX_WISHES_PER_IMPORT) {
    const wishes = saved.wishes.slice(start, start + MAX_WISHES_PER_IMPORT);
    const wishlists = start === 0 ? saved.wishlists : [];
    if (wishes.length + wishlists.length === 0) break;
    const rest = saved.wishes.slice(start + MAX_WISHES_PER_IMPORT);
    batches.push({
      changeId: importId(wishes[0]?.cardId ?? wishlists[0]!.id),
      change: { type: 'import', wishlists, wishes },
      rest: rest.length > 0 ? { wishlists: saved.wishlists, wishes: rest } : undefined,
    });
  }
  return batches;
}

export interface ServerWishlistSourceOptions {
  request: ServerRequest;
  cache: Stored<Wishes>;
  local: Stored<Wishes>;
  outbox: Stored<readonly QueuedChange<WishlistChange>[]>;
  newChangeId: () => string;
}

/** The wishes of a signed in account, kept on our server and sent the same way as the collection. */
export function createServerWishlistSource(options: ServerWishlistSourceOptions): WishlistSource {
  return createServerSource({
    ...options,
    applyChange: applyWishlistChange,
    readBody: (body) => restoreWishes(body, '', new Date().toISOString()),
    refusalOf,
    uploadBatches: importBatches,
  });
}
