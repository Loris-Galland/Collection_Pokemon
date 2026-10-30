import { useCallback, useEffect, useState } from 'react';

// Shared in-memory cache, so going back to a screen you already visited is instant. It keeps the promise and not only
// the result, so two screens asking for the same data at the same time share one request.
interface Entry {
  promise: Promise<unknown>;
  data?: unknown;
  /** Time the entry was stored, used for expiry. */
  storedAt: number;
}

const cache = new Map<string, Entry>();

/** Older data is fetched again, since prices change once a day. */
const MAX_AGE_MS = 60 * 60 * 1000;
/** Maximum number of entries. The oldest ones, often old searches, are evicted first. */
const MAX_ENTRIES = 400;

function freshEntry(key: string): Entry | undefined {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.storedAt > MAX_AGE_MS) {
    cache.delete(key);
    return undefined;
  }
  return entry;
}

/** Loads data through the shared cache. A failure does not stay in the cache. */
export function fetchCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = freshEntry(key);
  if (existing) return existing.promise as Promise<T>;

  const entry: Entry = { promise: fetcher(), storedAt: Date.now() };
  entry.promise.then(
    (data) => {
      entry.data = data;
    },
    () => {
      if (cache.get(key) === entry) cache.delete(key);
    },
  );
  cache.set(key, entry);
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  return entry.promise as Promise<T>;
}

/** Data already loaded for this key, without starting a request. */
function cachedData<T>(key: string): T | undefined {
  return freshEntry(key)?.data as T | undefined;
}

interface QueryState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  retry: () => void;
}

interface Result<T> {
  key: string;
  data?: T;
  error?: Error;
}

/** Loads async data identified by a key, with caching and retry. */
export function useQuery<T>(key: string, fetcher: () => Promise<T>): QueryState<T> {
  const [result, setResult] = useState<Result<T>>({ key });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (cachedData(key) !== undefined) return;
    let cancelled = false;
    fetchCached(key, fetcher)
      .then((data) => {
        if (!cancelled) setResult({ key, data });
      })
      .catch((err: unknown) => {
        if (!cancelled) setResult({ key, error: err instanceof Error ? err : new Error(String(err)) });
      });
    return () => {
      cancelled = true;
    };
    // `fetcher` is recreated on every render, and the key is enough to describe the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const retry = useCallback(() => {
    setResult({ key });
    setAttempt((n) => n + 1);
  }, [key]);

  // A result obtained for another key (when a screen is reused) is ignored.
  const current = result.key === key ? result : undefined;
  const data = cachedData<T>(key) ?? current?.data;
  const error = data === undefined ? current?.error : undefined;
  return { data, error, loading: data === undefined && error === undefined, retry };
}
