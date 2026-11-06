import {
  MAX_COPY_QUANTITY,
  combinationOf,
  type CollectionChange,
  type Copy,
  type CopyInput,
} from '@collection/shared/compiled';
import { MongoBulkWriteError, type AnyBulkWriteOperation } from 'mongodb';

import { copies, type CopyDocument } from './copies.js';

export { deleteCollection } from './copies.js';

/** Most copies one account can hold, so that one account cannot fill the free database (512 MB in all). */
export const MAX_COPIES_PER_ACCOUNT = 10_000;

/**
 * Most copies across every account, about 250 MB. Past it adds are refused, so the accounts and the sign in keep room
 * even if many accounts are made to fill the database.
 */
const MAX_COPIES_IN_DATABASE = 1_000_000;

const DUPLICATE_KEY = 11000;

let indexesReady: Promise<unknown> | undefined;

/**
 * Each copy id exists once per account, and so does each combination. The second index is what merges two copies
 * added at the same moment from two phones.
 */
function ensureIndexes(): Promise<unknown> {
  indexesReady ??= Promise.all([
    copies().createIndex({ userId: 1, id: 1 }, { unique: true }),
    copies().createIndex({ userId: 1, cardId: 1, variant: 1, language: 1, condition: 1 }, { unique: true }),
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

/** Positions of the writes refused because a document with the same unique key appeared meanwhile. */
function duplicatePositions(error: unknown): number[] | undefined {
  if (!(error instanceof MongoBulkWriteError)) return undefined;
  const writeErrors = Array.isArray(error.writeErrors) ? error.writeErrors : [error.writeErrors];
  if (writeErrors.some((writeError) => writeError.code !== DUPLICATE_KEY)) return undefined;
  return writeErrors.map((writeError) => writeError.index);
}

async function isFull(userId: string, added: number): Promise<boolean> {
  if (added === 0) return false;
  // A count from the collection metadata, which costs nothing.
  if ((await copies().estimatedDocumentCount()) + added > MAX_COPIES_IN_DATABASE) return true;
  return (await copies().countDocuments({ userId })) + added > MAX_COPIES_PER_ACCOUNT;
}

/**
 * Saves a change already checked by `isCollectionChange`. Returns `full` and changes nothing when the account or the
 * database would go over its limit. Returns `conflict` when a new copy reuses the id of another copy of the account,
 * and then the other writes of the change are already saved.
 *
 * An add sent twice counts twice. The phone must not send it again on its own after a failure.
 */
export async function saveCollectionChange(
  userId: string,
  change: CollectionChange,
): Promise<'saved' | 'full' | 'conflict'> {
  await ensureIndexes();
  const added = change.type === 'add' ? 1 : change.type === 'add-many' ? change.entries.length : 0;
  if (await isFull(userId, added)) return 'full';

  const operations = operationsOf(userId, change);
  try {
    await copies().bulkWrite(operations, { ordered: false });
  } catch (error) {
    // Two phones that create the same combination at the same moment both try to insert it. The one that lost only has
    // to run its writes again, which now find the copy and raise its quantity.
    const positions = duplicatePositions(error);
    if (!positions) throw error;
    try {
      await copies().bulkWrite(
        positions.map((position) => operations[position]!),
        { ordered: false },
      );
    } catch (retryError) {
      // Still a duplicate, so the id itself is taken.
      if (!duplicatePositions(retryError)) throw retryError;
      return 'conflict';
    }
  }
  return 'saved';
}
