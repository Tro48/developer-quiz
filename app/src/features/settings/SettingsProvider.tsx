import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import type { SQLiteDatabase } from 'expo-sqlite';

import { getSetting, setSetting } from '@/db/settings';
import { getUserDb } from '@/db/userDb';
import { isLanguage, type Language } from '@/i18n';
import { isThemeName, type ThemeName } from '@/theme';

const DEFAULT_THEME: ThemeName = 'dark';
const DEFAULT_LANGUAGE: Language = 'ru';

export type AppSettings = {
  theme: ThemeName;
  language: Language;
  setTheme: (theme: ThemeName) => void;
  setLanguage: (language: Language) => void;
};

const SettingsContext = createContext<AppSettings | null>(null);

export function SettingsProvider({ children }: PropsWithChildren) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME);
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const userDb = await getUserDb();
      const [storedTheme, storedLanguage] = await Promise.all([
        getSetting(userDb, 'theme'),
        getSetting(userDb, 'language'),
      ]);
      if (cancelled) {
        return;
      }
      if (storedTheme && isThemeName(storedTheme)) {
        setThemeState(storedTheme);
      }
      if (storedLanguage && isLanguage(storedLanguage)) {
        setLanguageState(storedLanguage);
      }
      setDb(userDb);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = useCallback(
    (next: ThemeName) => {
      setThemeState(next);
      if (db) {
        void setSetting(db, 'theme', next);
      }
    },
    [db]
  );

  const setLanguage = useCallback(
    (next: Language) => {
      setLanguageState(next);
      if (db) {
        void setSetting(db, 'language', next);
      }
    },
    [db]
  );

  const value = useMemo<AppSettings | null>(
    () => (db ? { theme, language, setTheme, setLanguage } : null),
    [db, theme, language, setTheme, setLanguage]
  );

  if (!value) {
    return null;
  }
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): AppSettings {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
