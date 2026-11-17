import type { ServerRequest } from '@/lib/change-queue';

import { API_URL, authClient } from './auth-client';

/** Past this delay the server counts as unreachable, so a weak network does not leave a change hanging. */
const TIMEOUT_MS = 15_000;

/** Calls a route of our server with the session of the signed in account. */
export function serverRequest(path: string): ServerRequest {
  return async (request) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetch(`${API_URL}${path}`, {
        method: request.method,
        credentials: 'omit',
        headers: { cookie: await authClient.getCookie(), 'content-type': 'application/json' },
        body: request.method === 'POST' ? JSON.stringify(request.body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };
}
