import { useState } from 'react';

import { authErrorMessage, type AuthError } from './auth-errors';

interface AuthResult<T> {
  data: T | null;
  error: AuthError | null;
}

/** Sends account requests from a form, keeping track of the waiting state and of the message to show on failure. */
export function useAccountRequest() {
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const send = async <T>(request: () => Promise<AuthResult<T>>, onSuccess: (data: T) => void | Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      const result = await request();
      if (result.error) setError(authErrorMessage(result.error));
      else await onSuccess(result.data as T);
    } catch {
      setError(authErrorMessage({}));
    } finally {
      setBusy(false);
    }
  };

  return { error, setError, busy, send };
}
