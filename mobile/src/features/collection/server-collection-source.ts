import {
  MAX_ENTRIES_PER_CHANGE,
  MAX_ID_LENGTH,
  applyCollectionChange,
  isCopy,
  type CollectionChange,
  type Copy,
} from '@collection/shared';

import { CollectionSourceError, type CollectionSource, type SaveFailure } from './collection-source.ts';

/** Copies saved on the phone under one key. `read` gives undefined when nothing is saved there. */
export interface StoredCopies {
  read(): Promise<Copy[] | undefined>;
  write(copies: readonly Copy[]): Promise<void>;
  remove(): Promise<void>;
}

/** Sends one request to the collection route of the server. Rejects when the server cannot be reached. */
export type CollectionRequest = (request: { method: 'GET' } | { method: 'POST'; body: unknown }) => Promise<Response>;

export interface ServerCollectionSourceOptions {
  request: CollectionRequest;
  /** The collection last read from the server, shown when it cannot be reached. */
  cache: StoredCopies;
  /** What the account saved on this phone before its collection moved to the server. It is sent once. */
  local: StoredCopies;
  newChangeId: () => string;
  wait?: (ms: number) => Promise<void>;
}

/** Pauses between the tries of a change the server did not answer. */
export const RETRY_DELAYS_MS = [1000, 3000];

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function failureOf(response: Response): Promise<SaveFailure> {
  if (response.status === 401) return 'signed-out';
  if (response.status !== 409) return 'other';
  const body = (await response.json().catch(() => undefined)) as { error?: unknown } | undefined;
  return body?.error === 'collection_full' ? 'full' : 'other';
}

interface UploadBatch {
  changeId: string;
  change: CollectionChange;
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

/**
 * The collection of a signed in account, kept on our server. Each change carries an id, so a change the server did not
 * answer can be sent again without counting twice. When the server cannot be reached, the last collection read from it
 * is shown read-only.
 */
export function createServerCollectionSource(options: ServerCollectionSourceOptions): CollectionSource {
  const { request, cache, local, newChangeId, wait = pause } = options;
  let current: Copy[] = [];

  /** Sends a change, trying again while the server cannot be reached or fails. A refusal is never tried again. */
  async function send(changeId: string, change: CollectionChange): Promise<void> {
    for (let attempt = 0; ; attempt++) {
      let failure: SaveFailure;
      let canRetry: boolean;
      try {
        const response = await request({ method: 'POST', body: { changeId, change } });
        if (response.ok) return;
        failure = await failureOf(response);
        canRetry = response.status >= 500;
      } catch {
        failure = 'offline';
        canRetry = true;
      }
      const delay = RETRY_DELAYS_MS[attempt];
      if (!canRetry || delay === undefined) throw new CollectionSourceError(failure);
      await wait(delay);
    }
  }

  /** Sends what the account saved on this phone before. Each batch leaves the phone once the server has it. */
  async function sendLocalCollection(): Promise<void> {
    const saved = await local.read();
    if (!saved) return;
    for (const { changeId, change, rest } of uploadBatches(saved)) {
      await send(changeId, change);
      await (rest.length > 0 ? local.write(rest) : local.remove());
    }
    if (saved.length === 0) await local.remove();
  }

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

  return {
    async load() {
      try {
        // What is left is sent again at the next start, and the server reads it as the same change.
        await sendLocalCollection().catch((error) => console.warn('Could not send the collection of this phone', error));
        current = await readServer();
        cache.write(current).catch((error) => console.warn('Could not keep the collection for offline use', error));
        return { copies: current, readOnly: false };
      } catch (error) {
        const known = (await cache.read()) ?? (await local.read());
        if (!known) throw error;
        current = known;
        return { copies: known, readOnly: true };
      }
    },
    async apply(change) {
      await send(newChangeId(), change);
      current = applyCollectionChange(current, change);
      cache.write(current).catch((error) => console.warn('Could not keep the collection for offline use', error));
    },
  };
}
