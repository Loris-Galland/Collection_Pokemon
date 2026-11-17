import {
  MAX_ENTRIES_PER_CHANGE,
  MAX_ID_LENGTH,
  applyCollectionChange,
  isChangeId,
  isCollectionChange,
  isCopy,
  type CollectionChange,
  type Copy,
} from '@collection/shared';

import { CollectionSourceError, type CollectionSource, type SyncReport } from './collection-source.ts';
import {
  createChangeQueue,
  type QueuedChange as GenericQueuedChange,
  type ServerRequest,
  type Stored,
} from '../../lib/change-queue.ts';

export type { Stored };

export type StoredCopies = Stored<readonly Copy[]>;

/** A collection change kept on the phone until the server has it. */
export type QueuedChange = GenericQueuedChange<CollectionChange>;

export type StoredChanges = Stored<readonly QueuedChange[]>;

/** Keeps the valid changes only, so one corrupted entry does not cost the others. */
export const restoreQueuedChanges = (value: unknown): QueuedChange[] | undefined =>
  Array.isArray(value)
    ? value.filter(
        (entry): entry is QueuedChange =>
          typeof entry === 'object' && entry !== null && isChangeId(entry.changeId) && isCollectionChange(entry.change),
      )
    : undefined;

/** Sends one request to the collection route of the server. Rejects when the server cannot be reached. */
export type CollectionRequest = ServerRequest;

export interface ServerCollectionSourceOptions {
  request: CollectionRequest;
  /** The collection as last shown, changes not yet sent included. It is shown when the server cannot be reached. */
  cache: StoredCopies;
  /** What the account saved on this phone before its collection moved to the server. It is sent once. */
  local: StoredCopies;
  /** The changes made while the server could not be reached. */
  outbox: StoredChanges;
  newChangeId: () => string;
}

async function refusalOf(response: Response): Promise<'full' | 'other'> {
  if (response.status !== 409) return 'other';
  const body = (await response.json().catch(() => undefined)) as { error?: unknown } | undefined;
  return body?.error === 'collection_full' ? 'full' : 'other';
}

interface UploadBatch extends QueuedChange {
  /** The copies still to send once this batch has arrived. */
  rest: Copy[];
}

/**
 * Splits saved copies into adds of the largest size the server accepts. The id of a batch comes from its first copy,
 * so a batch sent again after the app was closed keeps the same change id and the server does not count it twice.
 */
function uploadBatches(copies: readonly Copy[]): UploadBatch[] {
  const unique = [...new Map(copies.map((copy) => [copy.id, copy])).values()].sort((a, b) => (a.id < b.id ? -1 : 1));
  const batches: UploadBatch[] = [];
  for (let start = 0; start < unique.length; start += MAX_ENTRIES_PER_CHANGE) {
    const batch = unique.slice(start, start + MAX_ENTRIES_PER_CHANGE);
    batches.push({
      changeId: `upload-${batch[0]!.id}`.slice(0, MAX_ID_LENGTH),
      change: { type: 'add-many', entries: batch.map(({ id, ...input }) => ({ id, input })) },
      rest: unique.slice(start + MAX_ENTRIES_PER_CHANGE),
    });
  }
  return batches;
}

const warn = (what: string) => (error: unknown) => console.warn(`Could not ${what}`, error);

/**
 * The collection of a signed in account, kept on our server. A change is first kept on the phone with its own id,
 * then sent. Without a network it waits there and leaves when the server can be reached again. The server applies an
 * id only once, so sending a change again is harmless.
 */
export function createServerCollectionSource(options: ServerCollectionSourceOptions): CollectionSource {
  const { request, cache, local, outbox, newChangeId } = options;
  let current: Copy[] = [];
  const queue = createChangeQueue<CollectionChange, 'full' | 'other'>({
    outbox,
    request,
    refusalOf,
    // The old collection goes first, since a queued change may be about one of its copies.
    before: async (send) => {
      const saved = await local.read();
      if (!saved) return true;
      for (const batch of uploadBatches(saved)) {
        if ((await send(batch)) !== 'sent') return false;
        await (batch.rest.length > 0 ? local.write(batch.rest) : local.remove());
      }
      if (saved.length === 0) await local.remove();
      return true;
    },
  });

  async function readServer(): Promise<Copy[]> {
    let response: Response;
    try {
      response = await request({ method: 'GET' });
    } catch {
      throw new CollectionSourceError('offline');
    }
    if (!response.ok) throw new CollectionSourceError(response.status === 401 ? 'signed-out' : 'other');
    const body = (await response.json()) as { copies?: unknown };
    if (!Array.isArray(body.copies)) throw new CollectionSourceError('other');
    return body.copies.filter(isCopy);
  }

  const keepForOffline = () => cache.write(current).catch(warn('keep the collection for offline use'));

  return {
    async load() {
      await queue.load();
      await queue.drain();
      try {
        // What the server has, plus what it does not have yet.
        current = queue
          .entries()
          .reduce((copies, entry) => applyCollectionChange(copies, entry.change), await readServer());
        keepForOffline();
      } catch (error) {
        const known = (await cache.read()) ?? (await local.read());
        if (!known) throw error;
        current = [...known];
      }
      return { copies: current };
    },
    async apply(change) {
      try {
        await queue.add({ changeId: newChangeId(), change });
      } catch (error) {
        // Without the queue the change would be lost when the app closes, so it is not accepted at all.
        throw new CollectionSourceError('other', { cause: error });
      }
      current = applyCollectionChange(current, change);
      keepForOffline();
    },
    async sync(): Promise<SyncReport> {
      await queue.drain();
      return { unsentCount: queue.entries().length, refused: queue.takeRefusal() };
    },
  };
}
