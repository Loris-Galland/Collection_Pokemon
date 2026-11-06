import { accountLimitKeys, countEvent } from '../src/account-limit.js';
import { deleteAvatar, isValidAvatar, readAvatar, saveAvatar } from '../src/avatar.js';
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

// A picture of 30 KB in base64, in its JSON envelope.
const MAX_REQUEST_LENGTH = 45_000;
const LIMIT_WINDOW_MS = 60_000;
const MAX_READS_PER_WINDOW = 60;
const MAX_WRITES_PER_WINDOW = 10;

/** Each account only reaches its own picture, since the id comes from the session and never from the request. */
export async function GET(request: Request): Promise<Response> {
  const userId = await signedInUserId(request);
  if (!userId) return unauthorized();
  const reads = await countEvent(accountLimitKeys(userId).avatarRead, LIMIT_WINDOW_MS);
  if (reads > MAX_READS_PER_WINDOW) return tooManyRequests();
  return Response.json({ image: await readAvatar(userId) }, { headers: NO_STORE });
}

export async function PUT(request: Request): Promise<Response> {
  const userId = await signedInUserId(request);
  if (!userId) return unauthorized();
  if (Number(request.headers.get('content-length')) > MAX_REQUEST_LENGTH) return tooLarge();
  const writes = await countEvent(accountLimitKeys(userId).avatarWrite, LIMIT_WINDOW_MS);
  if (writes > MAX_WRITES_PER_WINDOW) return tooManyRequests();
  const body = await readJsonBody(request, MAX_REQUEST_LENGTH);
  if (body === TOO_LARGE) return tooLarge();
  const image = (body as { image?: unknown } | null | undefined)?.image;
  if (!isValidAvatar(image)) return errorResponse('invalid_image', 400);
  await saveAvatar(userId, image);
  return noContent();
}

export async function DELETE(request: Request): Promise<Response> {
  const userId = await signedInUserId(request);
  if (!userId) return unauthorized();
  const writes = await countEvent(accountLimitKeys(userId).avatarWrite, LIMIT_WINDOW_MS);
  if (writes > MAX_WRITES_PER_WINDOW) return tooManyRequests();
  await deleteAvatar(userId);
  return noContent();
}
