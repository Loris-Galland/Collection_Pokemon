import { isChangeId, isWishlistChange } from '@collection/shared/compiled';

import { accountLimitKeys, countEvent } from '../src/account-limit.js';
import {
  NO_STORE,
  TOO_LARGE,
  errorResponse,
  noContent,
  readJsonBody,
  signedInUserId,
  tooLarge,
  tooManyRequests,
  unauthorized,
} from '../src/http.js';
import { readWishes, saveWishlistChange } from '../src/wishes.js';

// An import of the largest allowed size, with room to spare.
const MAX_REQUEST_LENGTH = 150_000;
const LIMIT_WINDOW_MS = 60_000;
const MAX_READS_PER_WINDOW = 60;
const MAX_WRITES_PER_WINDOW = 60;

/** The wishlists and wishes of the signed in account. */
export async function GET(request: Request): Promise<Response> {
  const userId = await signedInUserId(request);
  if (!userId) return unauthorized();
  const reads = await countEvent(accountLimitKeys(userId).wishesRead, LIMIT_WINDOW_MS);
  if (reads > MAX_READS_PER_WINDOW) return tooManyRequests();
  return Response.json(await readWishes(userId), { headers: NO_STORE });
}

/** Applies one change, sent as `{ changeId, change }`, at most once for each change id. */
export async function POST(request: Request): Promise<Response> {
  const userId = await signedInUserId(request);
  if (!userId) return unauthorized();
  const writes = await countEvent(accountLimitKeys(userId).wishesWrite, LIMIT_WINDOW_MS);
  if (writes > MAX_WRITES_PER_WINDOW) return tooManyRequests();
  const body = await readJsonBody(request, MAX_REQUEST_LENGTH);
  if (body === TOO_LARGE) return tooLarge();
  const { changeId, change } = (body ?? {}) as { changeId?: unknown; change?: unknown };
  if (!isChangeId(changeId) || !isWishlistChange(change)) return errorResponse('invalid_change', 400);
  const result = await saveWishlistChange(userId, changeId, change);
  if (result === 'too-many-wishes') return errorResponse('too_many_wishes', 409);
  if (result === 'too-many-lists') return errorResponse('too_many_wishlists', 409);
  return noContent();
}
