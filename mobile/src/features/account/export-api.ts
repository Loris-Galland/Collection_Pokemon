import { API_URL, authClient } from './auth-client';

const TIMEOUT_MS = 15_000;

/** Everything the server keeps about the signed in account. It is only shown to its owner, so it stays untyped. */
export async function fetchAccountExport(): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}/api/export`, {
      credentials: 'omit',
      headers: { cookie: await authClient.getCookie() },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Export request failed with status ${response.status}`);
    return (await response.json()) as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
  }
}
