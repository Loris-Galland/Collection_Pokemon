import { isAuthorizedCron } from '../../src/cron-auth.js';
import { purgeOldValueData, recordValueSnapshots, refreshOwnedPrices } from '../../src/prices.js';
import { purgeExpiredRecords } from '../../src/retention.js';

/** Time left for reading prices, so the snapshots are always recorded before the function is stopped at 60 s. */
const PRICE_READING_MS = 40_000;

/**
 * Daily job. Reads the prices of the owned cards on TCGdex, records the value of each collection for the day, then
 * removes expired records.
 */
export async function GET(request: Request): Promise<Response> {
  if (!isAuthorizedCron(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const prices = await refreshOwnedPrices(Date.now() + PRICE_READING_MS);
  const snapshots = await recordValueSnapshots();
  await purgeOldValueData();
  return Response.json({ prices, snapshots, purged: await purgeExpiredRecords() });
}
