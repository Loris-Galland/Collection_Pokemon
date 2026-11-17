import type { DailyValue } from '@collection/shared';
import { useEffect, useState } from 'react';

import { serverRequest } from '@/features/account/server-request';
import { readJson, writeJson } from '@/lib/storage';

import { useCollectionOwner } from './collection-provider';

const requestHistory = serverRequest('/api/value-history');
const historyKey = (userId: string) => `value-history/v1/${userId}`;

const isDailyValue = (value: unknown): value is DailyValue =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as DailyValue).date === 'string' &&
  typeof (value as DailyValue).amount === 'number';

const restoreHistory = (value: unknown): DailyValue[] | undefined =>
  Array.isArray(value) ? value.filter(isDailyValue) : undefined;

/**
 * The value history the server records each night for the signed in account. The last one read is kept on the phone,
 * so the curve shows offline too. A visitor has none.
 */
export function useValueHistory(): readonly DailyValue[] {
  const owner = useCollectionOwner();
  const [loaded, setLoaded] = useState<{ owner: string; history: DailyValue[] }>();

  useEffect(() => {
    if (!owner) return;
    let cancelled = false;
    const show = (history: DailyValue[]) => {
      if (!cancelled) setLoaded({ owner, history });
    };
    readJson(historyKey(owner), [], restoreHistory)
      .then(show, () => undefined)
      .then(async () => {
        const response = await requestHistory({ method: 'GET' });
        if (!response.ok) return;
        const history = restoreHistory(((await response.json()) as { history?: unknown }).history);
        if (!history) return;
        show(history);
        await writeJson(historyKey(owner), history);
      })
      .catch(() => {
        // Offline, the history kept on the phone stays on screen.
      });
    return () => {
      cancelled = true;
    };
  }, [owner]);

  return owner && loaded?.owner === owner ? loaded.history : [];
}
