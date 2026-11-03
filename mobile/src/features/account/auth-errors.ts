/** The default of Better Auth on the server. */
export const MIN_PASSWORD_LENGTH = 8;

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'E-mail ou mot de passe incorrect.',
  INVALID_PASSWORD: 'Mot de passe incorrect.',
  INVALID_EMAIL: 'Cette adresse e-mail n’est pas valide.',
  PASSWORD_TOO_SHORT: `Ton mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
  PASSWORD_TOO_LONG: 'Ton mot de passe est trop long.',
  USER_ALREADY_EXISTS: 'Un compte existe déjà avec cet e-mail.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Un compte existe déjà avec cet e-mail.',
  INVALID_CODE: 'Ce code est incorrect ou a expiré.',
  INVALID_TWO_FACTOR_COOKIE: 'Ta connexion a expiré. Recommence depuis le début.',
  INVALID_BACKUP_CODE: 'Ce code de secours est incorrect.',
  TWO_FACTOR_NOT_ENABLED: 'La validation en deux étapes n’est pas activée.',
  SESSION_EXPIRED: 'Pour ta sécurité, reconnecte-toi avant de faire cette action.',
  SESSION_NOT_FRESH: 'Pour ta sécurité, reconnecte-toi avant de faire cette action.',
  PROVIDER_NOT_FOUND: 'La connexion avec Google n’est pas disponible pour le moment.',
};

export interface AuthError {
  code?: string;
  status?: number;
}

/** The message to show for a failed account request, in French whatever the server says. */
export function authErrorMessage(error: AuthError): string {
  if (error.status === 429) return 'Trop de tentatives. Patiente un instant, puis réessaie.';
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code]!;
  if (!error.status) return 'Le serveur ne répond pas. Vérifie ta connexion, puis réessaie.';
  return 'Une erreur est survenue. Réessaie dans un instant.';
}

/**
 * The browser does not tell the app why a Google sign in stopped, so a cancelled sign in and an address already used by
 * a password account look the same.
 */
export const GOOGLE_NOT_COMPLETED_MESSAGE =
  'La connexion avec Google n’a pas abouti. Si tu as déjà un compte à mot de passe avec cette adresse, utilise ton mot de passe.';
