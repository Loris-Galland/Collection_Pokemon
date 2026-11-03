import { accountLimitKeys, countEvent } from '../src/account-limit.js';
import { auth } from '../src/auth.js';
import { deleteAvatar, isValidAvatar, readAvatar, saveAvatar } from '../src/avatar.js';

// No cross origin headers on purpose, so a website cannot read or change a picture with the cookies of its visitor.
const NO_STORE = { 'cache-control': 'no-store' };

// A picture of 30 KB in base64, in its JSON envelope.
const MAX_REQUEST_LENGTH = 45_000;
const LIMIT_WINDOW_MS = 60_000;
const MAX_READS_PER_WINDOW = 60;
const MAX_WRITES_PER_WINDOW = 10;

async function signedInUserId(request: Request): Promise<string | undefined> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id;
}

function tooManyRequests(): Response {
  return Response.json({ error: 'too_many_requests' }, { status: 429, headers: { ...NO_STORE, 'retry-after': '60' } });
}

function tooLarge(): Response {
  return Response.json({ error: 'too_large' }, { status: 413, headers: NO_STORE });
}

function unauthorized(): Response {
  return Response.json({ error: 'unauthorized' }, { status: 401, headers: NO_STORE });
}

function parseBody(text: string): { image?: unknown } | null {
  try {
    return JSON.parse(text) as { image?: unknown } | null;
  } catch {
    return null;
  }
}

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
  // The length header is optional, so the size is checked again on what really arrived.
  const text = await request.text();
  if (text.length > MAX_REQUEST_LENGTH) return tooLarge();
  const body = parseBody(text);
  if (!isValidAvatar(body?.image)) {
    return Response.json({ error: 'invalid_image' }, { status: 400, headers: NO_STORE });
  }
  await saveAvatar(userId, body.image);
  return new Response(null, { status: 204, headers: NO_STORE });
}

export async function DELETE(request: Request): Promise<Response> {
  const userId = await signedInUserId(request);
  if (!userId) return unauthorized();
  const writes = await countEvent(accountLimitKeys(userId).avatarWrite, LIMIT_WINDOW_MS);
  if (writes > MAX_WRITES_PER_WINDOW) return tooManyRequests();
  await deleteAvatar(userId);
  return new Response(null, { status: 204, headers: NO_STORE });
}
