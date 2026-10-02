import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { SettingsProvider, useSettings } from '@/features/settings/SettingsProvider';
import { I18nProvider } from '@/i18n';
import { ThemeProvider } from '@/theme';

const QUESTIONS_DB_NAME = 'questions-v1.db';

export default function RootLayout() {
  return (
    <SQLiteProvider
      databaseName={QUESTIONS_DB_NAME}
      assetSource={{ assetId: require('../../assets/db/questions-v1.db') }}
    >
      <SettingsProvider>
        <AppShell />
      </SettingsProvider>
    </SQLiteProvider>
  );
}

function AppShell() {
  const { theme, language } = useSettings();

  return (
    <ThemeProvider name={theme}>
      <I18nProvider language={language}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </I18nProvider>
    </ThemeProvider>
  );
}
