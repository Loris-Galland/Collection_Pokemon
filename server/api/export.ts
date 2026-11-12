import { accountLimitKeys, countEvent } from '../src/account-limit.js';
import { exportAccountData } from '../src/account-data.js';
import { NO_STORE, errorResponse, signedInUserId, tooManyRequests, unauthorized } from '../src/http.js';

// An export reads every collection of the account, so it is limited more than a plain read.
const LIMIT_WINDOW_MS = 60_000;
const MAX_EXPORTS_PER_WINDOW = 5;

/** Everything the server keeps about the signed in account, for its right of access. */
export async function GET(request: Request): Promise<Response> {
  const userId = await signedInUserId(request);
  if (!userId) return unauthorized();
  const exports = await countEvent(accountLimitKeys(userId).exportRead, LIMIT_WINDOW_MS);
  if (exports > MAX_EXPORTS_PER_WINDOW) return tooManyRequests();
  const data = await exportAccountData(userId);
  if (!data) return errorResponse('not_found', 404);
  return Response.json(data, { headers: NO_STORE });
}
