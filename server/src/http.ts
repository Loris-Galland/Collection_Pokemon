import { auth } from './auth.js';

// No cross origin headers on purpose, so a website cannot read or change account data with the cookies of its visitor.
export const NO_STORE = { 'cache-control': 'no-store' };

/** The account behind the request. It always comes from the session and never from the request itself. */
export async function signedInUserId(request: Request): Promise<string | undefined> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id;
}

export function errorResponse(error: string, status: number, headers: Record<string, string> = {}): Response {
  return Response.json({ error }, { status, headers: { ...NO_STORE, ...headers } });
}

export const unauthorized = () => errorResponse('unauthorized', 401);
export const tooLarge = () => errorResponse('too_large', 413);
export const tooManyRequests = () => errorResponse('too_many_requests', 429, { 'retry-after': '60' });
export const noContent = () => new Response(null, { status: 204, headers: NO_STORE });

/** What `readJsonBody` returns for a body that is too long. */
export const TOO_LARGE = Symbol('too-large');

/**
 * Reads a JSON body of at most `maxLength` characters. Returns `TOO_LARGE` when it is longer, and undefined when it is
 * not declared as JSON or not valid JSON.
 */
export async function readJsonBody(request: Request, maxLength: number): Promise<unknown> {
  // A plain HTML form cannot send this type, so another website cannot post here on behalf of a visitor.
  if (!request.headers.get('content-type')?.startsWith('application/json')) return undefined;
  if (Number(request.headers.get('content-length')) > maxLength) return TOO_LARGE;
  // The length header is optional, so the size is checked again on what really arrived.
  const text = await request.text();
  if (text.length > maxLength) return TOO_LARGE;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}
