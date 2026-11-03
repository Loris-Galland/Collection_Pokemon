import { auth } from '../src/auth.js';
import { deleteAvatar, isValidAvatar, readAvatar, saveAvatar } from '../src/avatar.js';

// No cross origin headers on purpose, so a website cannot read or change a picture with the cookies of its visitor.
const NO_STORE = { 'cache-control': 'no-store' };

async function signedInUserId(request: Request): Promise<string | undefined> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id;
}

function unauthorized(): Response {
  return Response.json({ error: 'unauthorized' }, { status: 401, headers: NO_STORE });
}

/** Each account only reaches its own picture, since the id comes from the session and never from the request. */
export async function GET(request: Request): Promise<Response> {
  const userId = await signedInUserId(request);
  if (!userId) return unauthorized();
  return Response.json({ image: await readAvatar(userId) }, { headers: NO_STORE });
}

export async function PUT(request: Request): Promise<Response> {
  const userId = await signedInUserId(request);
  if (!userId) return unauthorized();
  const body: { image?: unknown } | null = await request.json().catch(() => null);
  if (!isValidAvatar(body?.image)) {
    return Response.json({ error: 'invalid_image' }, { status: 400, headers: NO_STORE });
  }
  await saveAvatar(userId, body.image);
  return new Response(null, { status: 204, headers: NO_STORE });
}

export async function DELETE(request: Request): Promise<Response> {
  const userId = await signedInUserId(request);
  if (!userId) return unauthorized();
  await deleteAvatar(userId);
  return new Response(null, { status: 204, headers: NO_STORE });
}
