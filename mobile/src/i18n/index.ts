import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { en } from './en';
import { fr, type Translation } from './fr';

/** Languages the app itself is written in. The catalog and the copies have their own languages. */
export type AppLanguage = 'fr' | 'en';

export const APP_LANGUAGES: readonly AppLanguage[] = ['fr', 'en'];

export function isAppLanguage(value: unknown): value is AppLanguage {
  return APP_LANGUAGES.includes(value as AppLanguage);
}

/** The language of the phone when the app has it, English otherwise. */
export function deviceLanguage(): AppLanguage {
  const code = getLocales()[0]?.languageCode;
  return isAppLanguage(code) ? code : 'en';
}

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: Translation };
  }
}

/**
 * i18next picks plurals with `Intl.PluralRules`, which some versions of Hermes lack. French and English only need "one"
 * and "other", with 0 counted as one in French, so a small stand in is enough when it is missing.
 */
function ensurePluralRules(): void {
  if (typeof Intl.PluralRules === 'function') return;
  class PluralRules {
    private readonly french: boolean;
    constructor(locale?: string | string[]) {
      const code = Array.isArray(locale) ? locale[0] : locale;
      this.french = (code ?? '').startsWith('fr');
    }
    select(count: number): 'one' | 'other' {
      const whole = Math.floor(Math.abs(count));
      return (this.french ? whole <= 1 : count === 1) ? 'one' : 'other';
    }
    resolvedOptions() {
      return { locale: this.french ? 'fr' : 'en', pluralCategories: ['one', 'other'], type: 'cardinal' };
    }
    static supportedLocalesOf(locales: string | string[]): string[] {
      return Array.isArray(locales) ? locales : [locales];
    }
  }
  (Intl as unknown as { PluralRules: unknown }).PluralRules = PluralRules;
}

ensurePluralRules();

// The texts are bundled with the app, so they load at once and the first screen never shows a key.
i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en } },
  lng: deviceLanguage(),
  fallbackLng: 'fr',
  initAsync: false,
  interpolation: { escapeValue: false },
});

/** Switches the texts of the whole app. Nothing happens when the language is already the current one. */
export function applyAppLanguage(language: AppLanguage): void {
  if (i18n.language !== language) i18n.changeLanguage(language);
}

/** The locale used to format numbers and amounts. */
export function numberLocale(): string {
  return i18n.language === 'en' ? 'en-IE' : 'fr-FR';
}

export { i18n };
