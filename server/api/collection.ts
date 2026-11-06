import { isCollectionChange } from '@collection/shared/compiled';

import { accountLimitKeys, countEvent } from '../src/account-limit.js';
import { readCollection, saveCollectionChange } from '../src/collection.js';
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

// An add-many of the largest allowed size, with room to spare.
const MAX_REQUEST_LENGTH = 150_000;
const LIMIT_WINDOW_MS = 60_000;
const MAX_READS_PER_WINDOW = 60;
const MAX_WRITES_PER_WINDOW = 60;

/** The collection of the signed in account. */
export async function GET(request: Request): Promise<Response> {
  const userId = await signedInUserId(request);
  if (!userId) return unauthorized();
  const reads = await countEvent(accountLimitKeys(userId).collectionRead, LIMIT_WINDOW_MS);
  if (reads > MAX_READS_PER_WINDOW) return tooManyRequests();
  return Response.json({ copies: await readCollection(userId) }, { headers: NO_STORE });
}

/** Applies one change, sent as `{ change }`, to the collection of the signed in account. */
export async function POST(request: Request): Promise<Response> {
  const userId = await signedInUserId(request);
  if (!userId) return unauthorized();
  const writes = await countEvent(accountLimitKeys(userId).collectionWrite, LIMIT_WINDOW_MS);
  if (writes > MAX_WRITES_PER_WINDOW) return tooManyRequests();
  const body = await readJsonBody(request, MAX_REQUEST_LENGTH);
  if (body === TOO_LARGE) return tooLarge();
  const change = (body as { change?: unknown } | null | undefined)?.change;
  if (!isCollectionChange(change)) return errorResponse('invalid_change', 400);
  const result = await saveCollectionChange(userId, change);
  if (result === 'full') return errorResponse('collection_full', 409);
  if (result === 'conflict') return errorResponse('id_taken', 409);
  return noContent();
}
