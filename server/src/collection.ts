import {
  MAX_COPY_QUANTITY,
  combinationOf,
  type CollectionChange,
  type Copy,
  type CopyInput,
} from '@collection/shared/compiled';
import type { AnyBulkWriteOperation } from 'mongodb';

import { appliedChanges, copies, type CopyDocument } from './copies.js';
import { mongoClient } from './db.js';

export { deleteCollection } from './copies.js';

/** Most copies one account can hold, so that one account cannot fill the free database (512 MB in all). */
export const MAX_COPIES_PER_ACCOUNT = 10_000;

/**
 * Most copies across every account, about 250 MB. Past it adds are refused, so the accounts and the sign in keep room
 * even if many accounts are made to fill the database.
 */
const MAX_COPIES_IN_DATABASE = 1_000_000;

/** How long a saved change id is kept. A phone sends a change again within minutes, or at its next start. */
const APPLIED_CHANGE_LIFETIME_S = 30 * 24 * 60 * 60;

const DUPLICATE_KEY = 11000;

// The default names MongoDB gives the two unique indexes. A duplicate error names the index it broke.
const COPY_ID_INDEX = 'userId_1_id_1';
const COMBINATION_INDEX = 'userId_1_cardId_1_variant_1_language_1_condition_1';

let indexesReady: Promise<unknown> | undefined;

/**
 * Each copy id exists once per account, and so does each combination. The second index is what merges two copies
 * added at the same moment from two phones. A change id is saved once per account and removed after a while.
 */
function ensureIndexes(): Promise<unknown> {
  indexesReady ??= Promise.all([
    copies().createIndex({ userId: 1, id: 1 }, { unique: true }),
    copies().createIndex({ userId: 1, cardId: 1, variant: 1, language: 1, condition: 1 }, { unique: true }),
    appliedChanges().createIndex({ userId: 1, changeId: 1 }, { unique: true }),
    appliedChanges().createIndex({ appliedAt: 1 }, { expireAfterSeconds: APPLIED_CHANGE_LIFETIME_S }),
  ]).catch((error: unknown) => {
    indexesReady = undefined;
    throw error;
  });
  return indexesReady;
}

/** The copies of an account. Adds sent at the same moment can pass the limit a little, so the read is capped too. */
export async function readCollection(userId: string): Promise<Copy[]> {
  return copies()
    .find({ userId }, { projection: { _id: 0, userId: 0 } })
    .limit(MAX_COPIES_PER_ACCOUNT)
    .toArray();
}

/**
 * Adds a copy, or raises the quantity of the copy with the same combination. It is the merge rule of `addCopy` done in
 * one atomic write, and the quantity never goes above the maximum.
 */
function addOperation(userId: string, id: string, input: CopyInput): AnyBulkWriteOperation<CopyDocument> {
  // In an update pipeline a string starting with "$" reads another field. `$literal` keeps what the phone sent as plain
  // text, so a value like "$$ROOT" is stored as written.
  return {
    updateOne: {
      filter: { userId, ...combinationOf(input) },
      update: [
        {
          $set: {
            id: { $ifNull: ['$id', { $literal: id }] },
            setId: { $ifNull: ['$setId', { $literal: input.setId }] },
            quantity: {
              $min: [MAX_COPY_QUANTITY, { $add: [{ $ifNull: ['$quantity', 0] }, { $literal: input.quantity }] }],
            },
          },
        },
      ],
      upsert: true,
    },
  };
}

function operationsOf(userId: string, change: CollectionChange): AnyBulkWriteOperation<CopyDocument>[] {
  switch (change.type) {
    case 'add':
      return [addOperation(userId, change.id, change.input)];
    case 'add-many':
      return change.entries.map((entry) => addOperation(userId, entry.id, entry.input));
    case 'set-quantity':
      return change.quantity < 1
        ? [{ deleteOne: { filter: { userId, id: change.copyId } } }]
        : [{ updateOne: { filter: { userId, id: change.copyId }, update: { $set: { quantity: change.quantity } } } }];
    case 'remove':
      return [{ deleteOne: { filter: { userId, id: change.copyId } } }];
  }
}

const addedCount = (change: CollectionChange) =>
  change.type === 'add' ? 1 : change.type === 'add-many' ? change.entries.length : 0;

/** The unique index a write broke, or undefined when the error is not a duplicate key. */
function duplicateIndex(error: unknown): string | undefined {
  const details = error as { code?: number; message?: string } | undefined;
  if (details?.code !== DUPLICATE_KEY) return undefined;
  return [COPY_ID_INDEX, COMBINATION_INDEX].find((name) => details.message?.includes(`index: ${name} `)) ?? 'other';
}

/** One try at saving a change. The change and its id are saved together in a transaction, or not at all. */
async function saveOnce(userId: string, changeId: string, change: CollectionChange): Promise<'saved' | 'full'> {
  const added = addedCount(change);
  const session = mongoClient.startSession();
  try {
    return await session.withTransaction(async () => {
      // Already saved, so the phone sent it again without knowing that the first try had arrived.
      if (await appliedChanges().findOne({ userId, changeId }, { session, projection: { _id: 1 } })) return 'saved';
      if (added > 0 && (await copies().countDocuments({ userId }, { session })) + added > MAX_COPIES_PER_ACCOUNT) {
        return 'full';
      }
      await copies().bulkWrite(operationsOf(userId, change), { session });
      await appliedChanges().insertOne({ userId, changeId, appliedAt: new Date() }, { session });
      return 'saved';
    });
  } finally {
    await session.endSession();
  }
}

/**
 * Saves a change already checked by `isCollectionChange`, at most once for each change id. Returns `full` and changes
 * nothing when the account or the database would go over its limit. Returns `conflict` and changes nothing when a new
 * copy reuses the id of another copy of the account.
 *
 * The phone can send a change again with the same id when it does not know whether the first try arrived.
 */
export async function saveCollectionChange(
  userId: string,
  changeId: string,
  change: CollectionChange,
): Promise<'saved' | 'full' | 'conflict'> {
  await ensureIndexes();
  // A count from the collection metadata. It costs nothing but cannot run inside a transaction.
  const added = addedCount(change);
  if (added > 0 && (await copies().estimatedDocumentCount()) + added > MAX_COPIES_IN_DATABASE) return 'full';
  for (let attempt = 1; ; attempt++) {
    try {
      return await saveOnce(userId, changeId, change);
    } catch (error) {
      const index = duplicateIndex(error);
      if (index === COPY_ID_INDEX) return 'conflict';
      // Two phones created the same combination at the same moment. The one that lost tries again, and then finds the
      // copy and raises its quantity.
      if (index !== COMBINATION_INDEX || attempt === 2) throw error;
    }
  }
}
