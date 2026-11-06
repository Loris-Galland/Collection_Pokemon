import { isCatalogLanguage, type CatalogLanguage } from '@collection/shared';
import { getLocales } from 'expo-localization';
import { createContext, useContext, useLayoutEffect, useMemo, type ReactNode } from 'react';

import { applyAppLanguage, deviceLanguage, isAppLanguage, type AppLanguage } from '@/i18n';
import { usePersistentState } from '@/lib/storage';

const STORAGE_KEY = 'settings/v1';

/** How the catalog shows the sets, small in a grid or as large cards. */
export type SetDisplay = 'grid' | 'large';

/** The app language, or the one of the phone. */
export type AppLanguageChoice = AppLanguage | 'system';

interface Settings {
  /** Language of the catalog, used for card names and previews. */
  catalogLanguage: CatalogLanguage;
  appLanguage: AppLanguageChoice;
  setDisplay: SetDisplay;
}

interface SettingsContextValue extends Settings {
  setCatalogLanguage: (language: CatalogLanguage) => void;
  setAppLanguage: (language: AppLanguageChoice) => void;
  setSetDisplay: (setDisplay: SetDisplay) => void;
}

/** The catalog starts in the language of the phone when it exists, in English otherwise. */
function defaultCatalogLanguage(): CatalogLanguage {
  const code = getLocales()[0]?.languageCode;
  return isCatalogLanguage(code) ? code : 'en';
}

const DEFAULT_SETTINGS: Settings = { catalogLanguage: defaultCatalogLanguage(), appLanguage: 'system', setDisplay: 'grid' };

const restoreSettings = (value: unknown): Settings | undefined => {
  if (typeof value !== 'object' || value === null) return undefined;
  const saved = value as Record<string, unknown>;
  // Version 1 called the catalog language `language`.
  const catalogLanguage = saved.catalogLanguage ?? saved.language;
  return {
    catalogLanguage: isCatalogLanguage(catalogLanguage) ? catalogLanguage : DEFAULT_SETTINGS.catalogLanguage,
    appLanguage: isAppLanguage(saved.appLanguage) ? saved.appLanguage : 'system',
    setDisplay: saved.setDisplay === 'large' ? 'large' : 'grid',
  };
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

/** Loads the settings on startup, applies the app language and saves the settings after every change. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings, loaded] = usePersistentState(STORAGE_KEY, DEFAULT_SETTINGS, restoreSettings);

  // A layout effect runs before the screen is painted, so no screen shows a text in the previous language.
  const appLanguage = loaded && settings.appLanguage !== 'system' ? settings.appLanguage : deviceLanguage();
  useLayoutEffect(() => applyAppLanguage(appLanguage), [appLanguage]);

  const value = useMemo(
    () => ({
      ...settings,
      setCatalogLanguage: (catalogLanguage: CatalogLanguage) => setSettings((s) => ({ ...s, catalogLanguage })),
      setAppLanguage: (appLanguage: AppLanguageChoice) => setSettings((s) => ({ ...s, appLanguage })),
      setSetDisplay: (setDisplay: SetDisplay) => setSettings((s) => ({ ...s, setDisplay })),
    }),
    [settings, setSettings],
  );

  if (!loaded) return null;
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

/** Gives any screen access to the settings. */
export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used inside <SettingsProvider>');
  return context;
}
