import { purgeOldLimits } from './account-limit.js';
import { db } from './db.js';

const RATE_LIMIT_RETENTION_MS = 24 * 60 * 60 * 1000;

/** Removes the records holding IP addresses once they are no longer useful. Returns how many were removed. */
export async function purgeExpiredRecords(now = new Date()): Promise<number> {
  const [rateLimits, sessions, accountLimits] = await Promise.all([
    db.collection('rateLimit').deleteMany({ lastRequest: { $lt: now.getTime() - RATE_LIMIT_RETENTION_MS } }),
    db.collection('session').deleteMany({ expiresAt: { $lt: now } }),
    purgeOldLimits(now.getTime() - RATE_LIMIT_RETENTION_MS),
  ]);
  return rateLimits.deletedCount + sessions.deletedCount + accountLimits;
}
