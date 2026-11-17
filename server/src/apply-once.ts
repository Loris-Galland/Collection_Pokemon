import type { ClientSession, Collection } from 'mongodb';

import type { AppliedChangeDocument } from './collections.js';
import { mongoClient } from './db.js';

/** Thrown to undo the transaction of a refused change, so nothing of it stays. */
const REFUSED = new Error('The change was refused');

/**
 * Applies a change at most once for each change id, in a transaction. The phone can send a change again when it does
 * not know whether the first try arrived, and then nothing happens. `work` returns `saved`, or the reason it refuses
 * the change. A refused change leaves nothing behind and its id is not kept, so sending it again is refused again.
 */
export async function applyOnce<R extends string>(
  applied: Collection<AppliedChangeDocument>,
  userId: string,
  changeId: string,
  work: (session: ClientSession) => Promise<'saved' | R>,
): Promise<'saved' | R> {
  let refusal: R | undefined;
  const session = mongoClient.startSession();
  try {
    await session.withTransaction(async () => {
      refusal = undefined;
      if (await applied.findOne({ userId, changeId }, { session, projection: { _id: 1 } })) return;
      const outcome = await work(session);
      if (outcome !== 'saved') {
        refusal = outcome;
        throw REFUSED;
      }
      await applied.insertOne({ userId, changeId, appliedAt: new Date() }, { session });
    });
    return 'saved';
  } catch (error) {
    if (error === REFUSED && refusal !== undefined) return refusal;
    throw error;
  } finally {
    await session.endSession();
  }
}
