import { db } from './db.js';

interface AccountLimitDocument {
  _id: string;
  count: number;
  windowStart: number;
}

const DUPLICATE_KEY = 11000;

const limits = () => db.collection<AccountLimitDocument>('accountLimit');

/** Better Auth only limits its own routes and only by address. These limits follow an account across addresses. */
export const accountLimitKeys = (userId: string) => ({
  avatarRead: `${userId}:avatar-read`,
  avatarWrite: `${userId}:avatar-write`,
  twoFactorFailure: `${userId}:two-factor-failure`,
});

/** Counts one more event in the current window and returns how many there are. It is atomic across functions. */
export async function countEvent(key: string, windowMs: number, now = Date.now()): Promise<number> {
  const expired = { $lt: [{ $ifNull: ['$windowStart', 0] }, now - windowMs] };
  const update = [
    {
      $set: {
        windowStart: { $cond: [expired, now, '$windowStart'] },
        count: { $cond: [expired, 1, { $add: ['$count', 1] }] },
      },
    },
  ];
  const increment = () => limits().findOneAndUpdate({ _id: key }, update, { upsert: true, returnDocument: 'after' });
  try {
    return (await increment())?.count ?? 1;
  } catch (error) {
    // Two first events at the same moment both try to create the document, and the second one just has to count.
    if ((error as { code?: number }).code !== DUPLICATE_KEY) throw error;
    return (await increment())?.count ?? 1;
  }
}

/** Whether the current window already holds this many events, without counting one more. */
export async function hasReachedLimit(key: string, max: number, windowMs: number, now = Date.now()): Promise<boolean> {
  const limit = await limits().findOne({ _id: key });
  return limit !== null && limit.windowStart >= now - windowMs && limit.count >= max;
}

export async function clearLimit(key: string): Promise<void> {
  await limits().deleteOne({ _id: key });
}

export async function clearAccountLimits(userId: string): Promise<void> {
  await limits().deleteMany({ _id: { $in: Object.values(accountLimitKeys(userId)) } });
}

/** Removes the counters whose window ended long ago. */
export async function purgeOldLimits(before: number): Promise<number> {
  return (await limits().deleteMany({ windowStart: { $lt: before } })).deletedCount;
}
