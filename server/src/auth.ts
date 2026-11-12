import { expo } from '@better-auth/expo';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { betterAuth } from 'better-auth';
import { twoFactor } from 'better-auth/plugins';

import { eraseBeforeUserDeletion, eraseAfterUserDeletion } from './account-data.js';
import { db, mongoClient } from './db.js';
import { requireTwoFactorCode } from './two-factor-guard.js';

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

// Expo Go on a local network address, the only extra origin a deployed server accepts.
const EXPO_GO_ORIGIN = /^exp:\/\/(192\.168|10)\.[\d.]+:\d+(\/\*\*)?$/;

/** Extra origins for development, comma separated. It must stay empty for a public release. */
function extraOrigins(): string[] {
  const origins = process.env.AUTH_EXTRA_ORIGINS?.split(',').filter(Boolean) ?? [];
  return process.env.NODE_ENV === 'production' ? origins.filter((origin) => EXPO_GO_ORIGIN.test(origin)) : origins;
}

export const auth = betterAuth({
  appName: 'Holo',
  database: mongodbAdapter(db, { client: mongoClient }),
  trustedOrigins: ['holo://', ...extraOrigins()],
  emailAndPassword: { enabled: true },
  socialProviders:
    googleClientId && googleClientSecret
      ? { google: { clientId: googleClientId, clientSecret: googleClientSecret } }
      : {},
  account: {
    // Emails are not verified yet, so the same address must not join two accounts. Otherwise someone could create an
    // account for another person in advance, and signing in with Google would skip two-factor authentication.
    accountLinking: { enabled: false },
  },
  user: {
    deleteUser: {
      enabled: true,
      beforeDelete: (user) => eraseBeforeUserDeletion(user.id),
      afterDelete: (user) => eraseAfterUserDeletion(user.id),
    },
  },
  hooks: { before: requireTwoFactorCode },
  // In the database, because the memory of a serverless function does not outlive it.
  rateLimit: {
    enabled: true,
    storage: 'database',
    // A guarded action checks a code, so it gets the same limit as the sign in.
    customRules: { '/delete-user': { window: 10, max: 3 } },
  },
  plugins: [expo(), twoFactor({ issuer: 'Holo' })],
});
