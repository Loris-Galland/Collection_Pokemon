import { createOTP } from '@better-auth/utils/otp';
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { symmetricDecrypt } from 'better-auth/crypto';

/** Actions that would remove the protection of an account, so a stolen password must not be enough for them. */
const GUARDED_PATHS = new Set(['/two-factor/disable', '/two-factor/enable', '/delete-user']);

const CODE_HEADER = 'x-two-factor-code';

function invalidCode(): APIError {
  return new APIError('FORBIDDEN', { code: 'INVALID_CODE', message: 'Invalid two-factor code' });
}

/** When two-factor authentication is on, the guarded actions also need a code from the authenticator app. */
export const requireTwoFactorCode = createAuthMiddleware(async (ctx) => {
  if (!GUARDED_PATHS.has(ctx.path)) return;

  const session = await getSessionFromCtx<{ twoFactorEnabled?: boolean }>(ctx);
  if (!session?.user.twoFactorEnabled) return;

  const code = ctx.headers?.get(CODE_HEADER);
  const twoFactor = await ctx.context.adapter.findOne<{ secret: string }>({
    model: 'twoFactor',
    where: [{ field: 'userId', value: session.user.id }],
  });
  if (!code || !twoFactor) throw invalidCode();

  const secret = await symmetricDecrypt({ key: ctx.context.secretConfig, data: twoFactor.secret });
  if (!(await createOTP(secret, { period: 30, digits: 6 }).verify(code))) throw invalidCode();
});
