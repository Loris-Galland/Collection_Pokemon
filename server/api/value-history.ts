import { accountLimitKeys, countEvent } from '../src/account-limit.js';
import { NO_STORE, signedInUserId, tooManyRequests, unauthorized } from '../src/http.js';
import { readValueHistory } from '../src/prices.js';

const LIMIT_WINDOW_MS = 60_000;
const MAX_READS_PER_WINDOW = 30;

/** The value history of the signed in account, one snapshot a day, oldest first. */
export async function GET(request: Request): Promise<Response> {
  const userId = await signedInUserId(request);
  if (!userId) return unauthorized();
  const reads = await countEvent(accountLimitKeys(userId).valueHistoryRead, LIMIT_WINDOW_MS);
  if (reads > MAX_READS_PER_WINDOW) return tooManyRequests();
  return Response.json({ history: await readValueHistory(userId) }, { headers: NO_STORE });
}
