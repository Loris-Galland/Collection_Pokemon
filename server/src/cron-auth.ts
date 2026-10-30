import { timingSafeEqual } from 'node:crypto';

/**
 * Vercel sends `Authorization Bearer <CRON_SECRET>` on every cron run. Without this check anyone could start the job.
 * When no secret is configured, everything is refused.
 */
export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const received = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  // Constant time comparison, so the duration does not reveal how many characters match.
  return received.length === expected.length && timingSafeEqual(received, expected);
}
