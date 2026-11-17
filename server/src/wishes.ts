import {
  MAX_WISHES_PER_ACCOUNT,
  MAX_WISHLISTS_PER_ACCOUNT,
  type Wish,
  type WishlistChange,
  type Wishes,
} from '@collection/shared/compiled';
import type { ClientSession } from 'mongodb';

import { mongoClient } from './db.js';
import { appliedWishlistChanges, wishes, wishlists } from './wish-store.js';

/** How long a saved change id is kept, as for the collection. */
const APPLIED_CHANGE_LIFETIME_S = 30 * 24 * 60 * 60;

let indexesReady: Promise<unknown> | undefined;

/** A list id exists once per account, a card is wished once per account, and a change id is saved once. */
function ensureIndexes(): Promise<unknown> {
  indexesReady ??= Promise.all([
    wishlists().createIndex({ userId: 1, id: 1 }, { unique: true }),
    wishes().createIndex({ userId: 1, cardId: 1 }, { unique: true }),
    wishes().createIndex({ userId: 1, wishlistId: 1 }),
    appliedWishlistChanges().createIndex({ userId: 1, changeId: 1 }, { unique: true }),
    appliedWishlistChanges().createIndex({ appliedAt: 1 }, { expireAfterSeconds: APPLIED_CHANGE_LIFETIME_S }),
  ]).catch((error: unknown) => {
    indexesReady = undefined;
    throw error;
  });
  return indexesReady;
}

const newestFirst = (a: string, b: string) => (a < b ? 1 : a > b ? -1 : 0);

/** The lists and wishes of an account, newest first, as the phone shows them. Reads are capped like the limits. */
export async function readWishes(userId: string): Promise<Wishes> {
  const projection = { _id: 0, userId: 0 } as const;
  const [lists, entries] = await Promise.all([
    wishlists().find({ userId }, { projection }).limit(MAX_WISHLISTS_PER_ACCOUNT).toArray(),
    wishes().find({ userId }, { projection }).limit(MAX_WISHES_PER_ACCOUNT).toArray(),
  ]);
  return {
    wishlists: lists.sort((a, b) => newestFirst(a.createdAt, b.createdAt)),
    wishes: entries.sort((a, b) => newestFirst(a.addedAt, b.addedAt)),
  };
}

type Outcome = 'saved' | 'too-many-wishes' | 'too-many-lists';

async function listExists(userId: string, wishlistId: string, session: ClientSession): Promise<boolean> {
  return (await wishlists().countDocuments({ userId, id: wishlistId }, { session, limit: 1 })) > 0;
}

/** Writes a wish, moving the card when it is already wished in another list. */
async function putWish(userId: string, wish: Wish, session: ClientSession, keepExisting: boolean): Promise<Outcome> {
  if (!(await listExists(userId, wish.wishlistId, session))) return 'saved';
  const existing = await wishes().findOne({ userId, cardId: wish.cardId }, { session, projection: { _id: 1 } });
  if (existing && keepExisting) return 'saved';
  if (!existing && (await wishes().countDocuments({ userId }, { session })) >= MAX_WISHES_PER_ACCOUNT) {
    return 'too-many-wishes';
  }
  // Each value is set as received, never read as an expression, since this is a plain update and not a pipeline.
  await wishes().updateOne(
    { userId, cardId: wish.cardId },
    { $set: { setId: wish.setId, wishlistId: wish.wishlistId, addedAt: wish.addedAt } },
    { upsert: true, session },
  );
  return 'saved';
}

async function apply(userId: string, change: WishlistChange, session: ClientSession): Promise<Outcome> {
  switch (change.type) {
    case 'create-list':
    case 'import': {
      const lists = change.type === 'create-list' ? [change.wishlist] : change.wishlists;
      for (const list of lists) {
        if (await listExists(userId, list.id, session)) continue;
        if ((await wishlists().countDocuments({ userId }, { session })) >= MAX_WISHLISTS_PER_ACCOUNT) {
          return 'too-many-lists';
        }
        await wishlists().insertOne({ userId, id: list.id, name: list.name, createdAt: list.createdAt }, { session });
      }
      if (change.type === 'import') {
        for (const wish of change.wishes) {
          const outcome = await putWish(userId, wish, session, true);
          if (outcome !== 'saved') return outcome;
        }
      }
      return 'saved';
    }
    case 'rename-list':
      await wishlists().updateOne({ userId, id: change.wishlistId }, { $set: { name: change.name } }, { session });
      return 'saved';
    case 'remove-list':
      await wishlists().deleteOne({ userId, id: change.wishlistId }, { session });
      await wishes().deleteMany({ userId, wishlistId: change.wishlistId }, { session });
      return 'saved';
    case 'add-wish':
      return putWish(userId, change.wish, session, false);
    case 'remove-wish':
      await wishes().deleteOne({ userId, cardId: change.cardId }, { session });
      return 'saved';
  }
}

/**
 * Saves a change already checked by `isWishlistChange`, at most once for each change id. A change that would pass a
 * limit changes nothing. A wish for a list that no longer exists is dropped without error, since the list was removed
 * on another phone.
 */
export async function saveWishlistChange(userId: string, changeId: string, change: WishlistChange): Promise<Outcome> {
  await ensureIndexes();
  const session = mongoClient.startSession();
  try {
    await session.withTransaction(async () => {
      if (await appliedWishlistChanges().findOne({ userId, changeId }, { session, projection: { _id: 1 } })) return;
      const outcome = await apply(userId, change, session);
      // Throwing undoes the transaction, so a refused change leaves nothing behind and its id is not saved.
      if (outcome !== 'saved') throw new Refused(outcome);
      await appliedWishlistChanges().insertOne({ userId, changeId, appliedAt: new Date() }, { session });
    });
    return 'saved';
  } catch (error) {
    if (error instanceof Refused) return error.outcome;
    throw error;
  } finally {
    await session.endSession();
  }
}

class Refused extends Error {
  constructor(readonly outcome: Exclude<Outcome, 'saved'>) {
    super(`The wishlist change was refused (${outcome})`);
  }
}
