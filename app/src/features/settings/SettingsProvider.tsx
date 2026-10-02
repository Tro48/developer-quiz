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

export type SettingsStatus = 'loading' | 'ready' | 'error';

export type AppSettings = {
  theme: ThemeName;
  language: Language;
  status: SettingsStatus;
  setTheme: (theme: ThemeName) => void;
  setLanguage: (language: Language) => void;
  reload: () => void;
};

const SettingsContext = createContext<AppSettings | null>(null);

export function SettingsProvider({ children }: PropsWithChildren) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [status, setStatus] = useState<SettingsStatus>('loading');
  const [attempt, setAttempt] = useState(0);
  const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME);
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
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
        setStatus('ready');
      } catch (error) {
        console.error('Не удалось инициализировать user.db', error);
        if (!cancelled) {
          setDb(null);
          setStatus('error');
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

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

  const reload = useCallback(() => {
    setStatus('loading');
    setAttempt((value) => value + 1);
  }, []);

  const value = useMemo<AppSettings>(
    () => ({ theme, language, status, setTheme, setLanguage, reload }),
    [theme, language, status, setTheme, setLanguage, reload]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): AppSettings {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
