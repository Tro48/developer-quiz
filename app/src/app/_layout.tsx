import { useState, type PropsWithChildren } from 'react';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { DbErrorBoundary } from '@/features/settings/DbErrorBoundary';
import { SettingsProvider, useSettings } from '@/features/settings/SettingsProvider';
import { StartupErrorScreen } from '@/features/settings/StartupErrorScreen';
import { I18nProvider } from '@/i18n';
import { ThemeProvider } from '@/theme';

const QUESTIONS_DB_NAME = 'questions-v2.db';

function QuestionsDbProvider({ children }: PropsWithChildren) {
  const [attempt, setAttempt] = useState(0);

  return (
    <DbErrorBoundary onRetry={() => setAttempt((value) => value + 1)}>
      <SQLiteProvider
        key={attempt}
        databaseName={QUESTIONS_DB_NAME}
        assetSource={{ assetId: require('../../assets/db/questions-v2.db') }}
      >
        {children}
      </SQLiteProvider>
    </DbErrorBoundary>
  );
}

export default function RootLayout() {
  return (
    <QuestionsDbProvider>
      <SettingsProvider>
        <AppShell />
      </SettingsProvider>
    </QuestionsDbProvider>
  );
}

function AppShell() {
  const { theme, language, status, reload } = useSettings();

  return (
    <ThemeProvider name={theme}>
      <I18nProvider language={language}>
        <StatusBar style="light" />
        {status === 'error' ? (
          <StartupErrorScreen onRetry={reload} />
        ) : status === 'ready' ? (
          <Stack screenOptions={{ headerShown: false }} />
        ) : null}
      </I18nProvider>
    </ThemeProvider>
  );
}
