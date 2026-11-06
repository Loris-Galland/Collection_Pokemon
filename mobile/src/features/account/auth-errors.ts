import { i18n } from '@/i18n';
import type { Translation } from '@/i18n/fr';

/** The default of Better Auth on the server. */
export const MIN_PASSWORD_LENGTH = 8;

/** Server error codes the app explains in its own words. */
type KnownCode = Exclude<keyof Translation['authErrors'], 'tooManyAttempts' | 'noServer' | 'unknown' | 'googleNotCompleted'>;

const KNOWN_CODES = new Set<string>([
  'INVALID_EMAIL_OR_PASSWORD',
  'INVALID_PASSWORD',
  'INVALID_EMAIL',
  'PASSWORD_TOO_SHORT',
  'PASSWORD_TOO_LONG',
  'USER_ALREADY_EXISTS',
  'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
  'INVALID_CODE',
  'INVALID_TWO_FACTOR_COOKIE',
  'INVALID_BACKUP_CODE',
  'TWO_FACTOR_NOT_ENABLED',
  'SESSION_EXPIRED',
  'SESSION_NOT_FRESH',
  'PROVIDER_NOT_FOUND',
] satisfies KnownCode[]);

export interface AuthError {
  code?: string;
  status?: number;
}

/** The message to show for a failed account request, in the app language whatever the server says. */
export function authErrorMessage(error: AuthError): string {
  if (error.status === 429) return i18n.t('authErrors.tooManyAttempts');
  if (error.code && KNOWN_CODES.has(error.code)) {
    return i18n.t(`authErrors.${error.code as KnownCode}`, { count: MIN_PASSWORD_LENGTH });
  }
  if (!error.status) return i18n.t('authErrors.noServer');
  return i18n.t('authErrors.unknown');
}

/**
 * The browser does not tell the app why a Google sign in stopped, so a cancelled sign in and an address already used by
 * a password account look the same.
 */
export function googleNotCompletedMessage(): string {
  return i18n.t('authErrors.googleNotCompleted');
}
