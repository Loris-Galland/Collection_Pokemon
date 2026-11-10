import { applyCollectionChange, isCopy, type Copy } from '@collection/shared';

import { readJson, removeJson, writeJson } from '@/lib/storage';

import type { CollectionSource } from './collection-source';
import type { StoredCopies } from './server-collection-source';

// Keeps the valid copies only, so one corrupted entry does not cost the whole collection.
export const restoreCopies = (value: unknown): Copy[] | undefined =>
  Array.isArray(value) ? value.filter(isCopy) : undefined;

/** The collection of a visitor, which lives on the phone only. */
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

/** Copies saved on the phone under one key, for the server source. */
export function storedCopies(storageKey: string): StoredCopies {
  return {
    read: () => readJson<Copy[] | undefined>(storageKey, undefined, restoreCopies),
    write: (copies) => writeJson(storageKey, copies),
    remove: () => removeJson([storageKey]),
  };
}
