import {
  MAX_ENTRIES_PER_CHANGE,
  MAX_ID_LENGTH,
  applyCollectionChange,
  isCopy,
  type CollectionChange,
  type Copy,
} from '@collection/shared';

import type { QueuedChange, ServerRequest, Stored } from '../../lib/change-queue.ts';
import { createServerSource, type UploadBatch } from '../../lib/synced-source.ts';
import type { CollectionSource } from './collection-source.ts';

export interface ServerCollectionSourceOptions {
  request: ServerRequest;
  cache: Stored<Copy[]>;
  local: Stored<Copy[]>;
  outbox: Stored<readonly QueuedChange<CollectionChange>[]>;
  newChangeId: () => string;
}

async function refusalOf(response: Response): Promise<'full' | 'other'> {
  if (response.status !== 409) return 'other';
  const body = (await response.json().catch(() => undefined)) as { error?: unknown } | undefined;
  return body?.error === 'collection_full' ? 'full' : 'other';
}

/** The copies of a collection in an answer of the server, keeping the valid ones only. */
export function readCopies(body: unknown): Copy[] | undefined {
  const copies = (body as { copies?: unknown } | null)?.copies;
  return Array.isArray(copies) ? copies.filter(isCopy) : undefined;
}

/** Splits saved copies into adds of the largest size the server accepts. The id of a batch comes from its first copy. */
function uploadBatches(copies: Copy[]): UploadBatch<Copy[], CollectionChange>[] {
  const unique = [...new Map(copies.map((copy) => [copy.id, copy])).values()].sort((a, b) => (a.id < b.id ? -1 : 1));
  const batches: UploadBatch<Copy[], CollectionChange>[] = [];
  for (let start = 0; start < unique.length; start += MAX_ENTRIES_PER_CHANGE) {
    const batch = unique.slice(start, start + MAX_ENTRIES_PER_CHANGE);
    const rest = unique.slice(start + MAX_ENTRIES_PER_CHANGE);
    batches.push({
      changeId: `upload-${batch[0]!.id}`.slice(0, MAX_ID_LENGTH),
      change: { type: 'add-many', entries: batch.map(({ id, ...input }) => ({ id, input })) },
      rest: rest.length > 0 ? rest : undefined,
    });
  }
  return batches;
}

/** The collection of a signed in account, kept on our server. */
export function createServerCollectionSource(options: ServerCollectionSourceOptions): CollectionSource {
  return createServerSource({
    ...options,
    applyChange: applyCollectionChange,
    readBody: readCopies,
    refusalOf,
    uploadBatches,
  });
}
