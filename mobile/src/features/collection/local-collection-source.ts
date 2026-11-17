import { applyCollectionChange, isCollectionChange, isCopy, type Copy } from '@collection/shared';

import { restoreQueue } from '@/lib/change-queue';
import { storedJson } from '@/lib/storage';
import { createLocalSource } from '@/lib/synced-source';

import type { CollectionSource } from './collection-source';

// Keeps the valid copies only, so one corrupted entry does not cost the whole collection.
const restoreCopies = (value: unknown): Copy[] | undefined => (Array.isArray(value) ? value.filter(isCopy) : undefined);

/** Copies saved on the phone under one key. */
export const storedCopies = (key: string) => storedJson(key, restoreCopies);

/** The collection changes waiting for the server, saved on the phone under one key. */
export const storedCollectionChanges = (key: string) => storedJson(key, restoreQueue(isCollectionChange));

/** The collection of a visitor, which lives on the phone only. */
export const createLocalCollectionSource = (key: string): CollectionSource =>
  createLocalSource(storedCopies(key), [], applyCollectionChange);
