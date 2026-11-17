import {
  MAX_ID_LENGTH,
  MAX_WISHES_PER_IMPORT,
  NO_WISHES,
  applyWishlistChange,
  isChangeId,
  isWishlistChange,
  restoreWishes,
  type WishlistChange,
  type Wishes,
} from '@collection/shared';

import { createChangeQueue, type QueuedChange, type ServerRequest, type Stored } from '../../lib/change-queue.ts';

/** Why a wish change could not be kept. */
export type WishSaveFailure = 'too-many-wishes' | 'too-many-lists' | 'signed-out' | 'other';

export interface WishSyncReport {
  unsentCount: number;
  refused?: WishSaveFailure;
}

/** Where the wishes are kept. `load` and `apply` reject when the source could not do the work. */
export interface WishlistSource {
  load(): Promise<Wishes>;
  apply(change: WishlistChange): Promise<void>;
  /** Forgets wishes for cards now owned. The server already removes them when the copy arrives. */
  forgetObtained(next: Wishes): Promise<void>;
  sync(): Promise<WishSyncReport>;
}

/** Keeps the valid changes only, so one corrupted entry does not cost the others. */
export const restoreQueuedWishChanges = (value: unknown): QueuedChange<WishlistChange>[] | undefined =>
  Array.isArray(value)
    ? value.filter(
        (entry): entry is QueuedChange<WishlistChange> =>
          typeof entry === 'object' && entry !== null && isChangeId(entry.changeId) && isWishlistChange(entry.change),
      )
    : undefined;

/** The wishes of a visitor, which live on the phone only. */
export function createLocalWishlistSource(stored: Stored<Wishes>): WishlistSource {
  let current: Wishes = NO_WISHES;
  return {
    async load() {
      current = (await stored.read()) ?? NO_WISHES;
      return current;
    },
    async apply(change) {
      const next = applyWishlistChange(current, change);
      await stored.write(next);
      current = next;
    },
    async forgetObtained(next) {
      await stored.write(next);
      current = next;
    },
    sync: async () => ({ unsentCount: 0 }),
  };
}

export interface ServerWishlistSourceOptions {
  request: ServerRequest;
  /** The wishes as last shown, changes not yet sent included. */
  cache: Stored<Wishes>;
  /** What the account saved on this phone before its wishes moved to the server. It is sent once. */
  local: Stored<Wishes>;
  outbox: Stored<readonly QueuedChange<WishlistChange>[]>;
  newChangeId: () => string;
}

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
function importBatches(saved: Wishes): (QueuedChange<WishlistChange> & { rest: Wishes })[] {
  const batches: (QueuedChange<WishlistChange> & { rest: Wishes })[] = [];
  for (let start = 0; start === 0 || start < saved.wishes.length; start += MAX_WISHES_PER_IMPORT) {
    const wishes = saved.wishes.slice(start, start + MAX_WISHES_PER_IMPORT);
    const wishlists = start === 0 ? saved.wishlists : [];
    if (wishes.length + wishlists.length === 0) break;
    batches.push({
      changeId: importId(wishes[0]?.cardId ?? wishlists[0]!.id),
      change: { type: 'import', wishlists, wishes },
      rest: { wishlists: saved.wishlists, wishes: saved.wishes.slice(start + MAX_WISHES_PER_IMPORT) },
    });
  }
  return batches;
}

/** The wishes of a signed in account, kept on our server and sent the same way as the collection. */
export function createServerWishlistSource(options: ServerWishlistSourceOptions): WishlistSource {
  const { request, cache, local, outbox, newChangeId } = options;
  let current: Wishes = NO_WISHES;

  const queue = createChangeQueue<WishlistChange, 'too-many-wishes' | 'too-many-lists' | 'other'>({
    outbox,
    request,
    refusalOf,
    // The wishes saved on the phone before go first, since a queued change may be about one of their lists.
    before: async (send) => {
      const saved = await local.read();
      if (!saved) return true;
      for (const batch of importBatches(saved)) {
        const result = await send(batch);
        // A refused import is dropped, since sending it again would be refused again.
        if (result === 'unreachable' || result === 'signed-out') return false;
        await (batch.rest.wishes.length > 0 ? local.write(batch.rest) : local.remove());
      }
      await local.remove();
      return true;
    },
  });

  async function readServer(): Promise<Wishes> {
    const response = await request({ method: 'GET' });
    if (!response.ok) throw new Error(`The server answered ${response.status} for the wishes`);
    const wishes = restoreWishes(await response.json(), '', new Date().toISOString());
    if (!wishes) throw new Error('The server sent wishes in an unknown format');
    return wishes;
  }

  const keep = () => cache.write(current).catch((error) => console.warn('Could not keep the wishes offline', error));

  return {
    async load() {
      await queue.load();
      await queue.drain();
      try {
        current = queue
          .entries()
          .reduce((wishes, entry) => applyWishlistChange(wishes, entry.change), await readServer());
        keep();
      } catch (error) {
        const known = (await cache.read()) ?? (await local.read());
        if (!known) throw error;
        current = known;
      }
      return current;
    },
    async apply(change) {
      await queue.add({ changeId: newChangeId(), change });
      current = applyWishlistChange(current, change);
      keep();
    },
    async forgetObtained(next) {
      current = next;
      keep();
    },
    async sync() {
      await queue.drain();
      return { unsentCount: queue.entries().length, refused: queue.takeRefusal() };
    },
  };
}
