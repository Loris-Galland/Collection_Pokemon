import { isLanguage, type Language } from '@collection/shared';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { usePersistentState } from '@/lib/storage';

const STORAGE_KEY = 'settings/v1';

/** How the catalog shows the sets, small in a grid or as large cards. */
export type SetDisplay = 'grid' | 'large';

interface Settings {
  /** Display language of the catalog, used for card names and previews. */
  language: Language;
  setDisplay: SetDisplay;
}

interface SettingsContextValue extends Settings {
  setLanguage: (language: Language) => void;
  setSetDisplay: (setDisplay: SetDisplay) => void;
}

const DEFAULT_SETTINGS: Settings = { language: 'fr', setDisplay: 'grid' };

const restoreSettings = (value: unknown): Settings | undefined =>
  typeof value === 'object' && value !== null && isLanguage((value as Record<string, unknown>).language)
    ? { language: (value as Settings).language, setDisplay: (value as Settings).setDisplay === 'large' ? 'large' : 'grid' }
    : undefined;

const SettingsContext = createContext<SettingsContextValue | null>(null);

/** Loads the settings on startup and saves them after every change. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings, loaded] = usePersistentState(STORAGE_KEY, DEFAULT_SETTINGS, restoreSettings);

  const value = useMemo(
    () => ({
      ...settings,
      setLanguage: (language: Language) => setSettings((s) => ({ ...s, language })),
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
