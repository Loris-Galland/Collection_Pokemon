import { isChangeId } from '@collection/shared/compiled';

import { countEvent } from './account-limit.js';
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
} from './http.js';

// The largest allowed change, an add of 500 copies or an import of 500 wishes, with room to spare.
const MAX_REQUEST_LENGTH = 150_000;
const LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 60;

export interface ChangeRouteOptions<C, R extends string> {
  /** The counters of reads and writes of an account, so one account cannot flood the route. */
  limitKeys: (userId: string) => { read: string; write: string };
  read: (userId: string) => Promise<unknown>;
  isChange: (value: unknown) => value is C;
  save: (userId: string, changeId: string, change: C) => Promise<'saved' | R>;
  /** The error code sent back with a 409 for each reason a change is refused. */
  refusals: Record<R, string>;
}

/**
 * A route that gives the data of the signed in account and applies one change to it, sent as `{ changeId, change }`.
 * The same change id is applied only once, so the phone can send a change again.
 */
export function changeRoute<C, R extends string>(options: ChangeRouteOptions<C, R>) {
  const { limitKeys, read, isChange, save, refusals } = options;
  return {
    async GET(request: Request): Promise<Response> {
      const userId = await signedInUserId(request);
      if (!userId) return unauthorized();
      if ((await countEvent(limitKeys(userId).read, LIMIT_WINDOW_MS)) > MAX_REQUESTS_PER_WINDOW)
        return tooManyRequests();
      return Response.json(await read(userId), { headers: NO_STORE });
    },
    async POST(request: Request): Promise<Response> {
      const userId = await signedInUserId(request);
      if (!userId) return unauthorized();
      if ((await countEvent(limitKeys(userId).write, LIMIT_WINDOW_MS)) > MAX_REQUESTS_PER_WINDOW)
        return tooManyRequests();
      const body = await readJsonBody(request, MAX_REQUEST_LENGTH);
      if (body === TOO_LARGE) return tooLarge();
      const { changeId, change } = (body ?? {}) as { changeId?: unknown; change?: unknown };
      if (!isChangeId(changeId) || !isChange(change)) return errorResponse('invalid_change', 400);
      const result = await save(userId, changeId, change);
      return result === 'saved' ? noContent() : errorResponse(refusals[result], 409);
    },
  };
}
