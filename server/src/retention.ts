import { purgeOrphanTwoFactor } from './account-data.js';
import { purgeOldLimits } from './account-limit.js';
import { db } from './db.js';

const RATE_LIMIT_RETENTION_MS = 24 * 60 * 60 * 1000;

/**
 * Removes the records holding IP addresses once they are no longer useful, and the two-factor secrets left without an
 * account. Returns how many were removed.
 */
export async function purgeExpiredRecords(now = new Date()): Promise<number> {
  const [rateLimits, sessions, accountLimits, twoFactors] = await Promise.all([
    db.collection('rateLimit').deleteMany({ lastRequest: { $lt: now.getTime() - RATE_LIMIT_RETENTION_MS } }),
    db.collection('session').deleteMany({ expiresAt: { $lt: now } }),
    purgeOldLimits(now.getTime() - RATE_LIMIT_RETENTION_MS),
    purgeOrphanTwoFactor(),
  ]);
  return rateLimits.deletedCount + sessions.deletedCount + accountLimits + twoFactors;
}
