import { isAuthorizedCron } from '../../src/cron-auth.ts';

/** Daily job. Fetches prices, then records a snapshot of each user's collection value. Not implemented yet. */
export function GET(request: Request): Response {
  if (!isAuthorizedCron(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  return Response.json({ status: 'not-implemented' }, { status: 501 });
}
