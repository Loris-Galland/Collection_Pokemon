import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { authClient } from './auth-client';

/** The signed in user, undefined for a visitor. */
export function useAccount() {
  const { data, isPending } = authClient.useSession();
  return { user: data?.user, loading: isPending };
}

/**
 * Wraps an action that needs an account. The catalog stays open to visitors, who are sent to the sign in screen when
 * they try to collect something.
 */
export function useRequireAccount(): (action: () => void) => void {
  const { user, loading } = useAccount();
  return useCallback(
    (action) => {
      if (user) action();
      else if (!loading) router.push('/sign-in');
    },
    [user, loading],
  );
}

/**
 * Whether the account signs in with a password, undefined until it is known. A Google account has none, and Google
 * protects its sign in instead.
 */
export function useHasPassword(): { hasPassword: boolean | undefined; failed: boolean; retry: () => void } {
  const [hasPassword, setHasPassword] = useState<boolean>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    authClient
      .listAccounts()
      .then((result) => {
        if (cancelled) return;
        if (result.data) setHasPassword(result.data.some((account) => account.providerId === 'credential'));
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((current) => current + 1);
  }, []);

  return { hasPassword, failed, retry };
}

/** Closes an account screen, going back when there is somewhere to go back to. */
export function leaveAccountScreen(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
