import { createOTP } from '@better-auth/utils/otp';
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { symmetricDecrypt } from 'better-auth/crypto';

import { accountLimitKeys, clearLimit, countEvent, hasReachedLimit } from './account-limit.js';

/** Actions that would remove the protection of an account, so a stolen password must not be enough for them. */
const GUARDED_PATHS = new Set(['/two-factor/disable', '/two-factor/enable', '/delete-user']);

const CODE_HEADER = 'x-two-factor-code';

// Better Auth locks an account the same way, but only for the codes of a sign in.
const MAX_FAILED_CODES = 5;
const LOCK_MS = 15 * 60 * 1000;

function tooManyFailures(): APIError {
  return new APIError('TOO_MANY_REQUESTS', { code: 'TOO_MANY_ATTEMPTS', message: 'Too many invalid codes' });
}

function invalidCode(): APIError {
  return new APIError('FORBIDDEN', { code: 'INVALID_CODE', message: 'Invalid two-factor code' });
}

/** When two-factor authentication is on, the guarded actions also need a code from the authenticator app. */
export const requireTwoFactorCode = createAuthMiddleware(async (ctx) => {
  if (!GUARDED_PATHS.has(ctx.path)) return;

  const session = await getSessionFromCtx<{ twoFactorEnabled?: boolean }>(ctx);
  if (!session?.user.twoFactorEnabled) return;

  const failures = accountLimitKeys(session.user.id).twoFactorFailure;
  if (await hasReachedLimit(failures, MAX_FAILED_CODES, LOCK_MS)) throw tooManyFailures();

  const code = ctx.headers?.get(CODE_HEADER);
  const twoFactor = await ctx.context.adapter.findOne<{ secret: string }>({
    model: 'twoFactor',
    where: [{ field: 'userId', value: session.user.id }],
  });
  if (!code || !twoFactor) throw invalidCode();

  const secret = await symmetricDecrypt({ key: ctx.context.secretConfig, data: twoFactor.secret });
  if (!(await createOTP(secret, { period: 30, digits: 6 }).verify(code))) {
    await countEvent(failures, LOCK_MS);
    throw invalidCode();
  }
  await clearLimit(failures);
});
