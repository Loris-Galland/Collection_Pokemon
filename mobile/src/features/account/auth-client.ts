import { expoClient } from '@better-auth/expo/client';
import { twoFactorClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

const DEVELOPMENT_API_URL = 'http://localhost:3000';

/** A release must reach the server over HTTPS. Failing here keeps a badly built APK from sending passwords in clear. */
function apiUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (__DEV__) return url ?? DEVELOPMENT_API_URL;
  if (!url?.startsWith('https://')) throw new Error('EXPO_PUBLIC_API_URL must be an https address in a release');
  return url;
}

/** Accounts live on our server. The session is kept in the encrypted storage of the phone. */
export const authClient = createAuthClient({
  baseURL: apiUrl(),
  plugins: [expoClient({ scheme: 'holo', storage: SecureStore }), twoFactorClient()],
});

/** Options for an action the server only accepts with a code from the authenticator app. */
export function withTwoFactorCode(code: string) {
  return { headers: { 'x-two-factor-code': code.trim() } };
}
