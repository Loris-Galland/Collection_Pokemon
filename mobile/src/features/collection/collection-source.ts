import { applyCollectionChange, isCopy, type CollectionChange, type Copy } from '@collection/shared';

import { readJson, writeJson } from '@/lib/storage';

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

// Keeps the valid copies only, so one corrupted entry does not cost the whole collection.
const restoreCopies = (value: unknown): Copy[] | undefined => (Array.isArray(value) ? value.filter(isCopy) : undefined);

/** Prototype only. The collection lives on the phone until the server (MongoDB) takes over. */
export function createLocalCollectionSource(storageKey: string): CollectionSource {
  let stored: Copy[] = [];
  return {
    async load() {
      stored = await readJson<Copy[]>(storageKey, [], restoreCopies);
      return { copies: stored, readOnly: false };
    },
    async apply(change) {
      const next = applyCollectionChange(stored, change);
      await writeJson(storageKey, next);
      stored = next;
    },
  };
}
