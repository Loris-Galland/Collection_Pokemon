import { isAuthorizedCron } from '../../src/cron-auth.js';
import { purgeExpiredRecords } from '../../src/retention.js';

/** Daily job. Removes expired records. Fetching prices and recording value snapshots are not implemented yet. */
export async function GET(request: Request): Promise<Response> {
  if (!isAuthorizedCron(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  return Response.json({ purged: await purgeExpiredRecords() });
}
