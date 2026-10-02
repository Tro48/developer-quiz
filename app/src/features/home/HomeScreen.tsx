import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppText, Button, Screen } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/theme';

import { GradeCard } from './GradeCard';
import { useHomeData } from './useHomeData';

export function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const { loading, error, progress, currentGrade, reload } = useHomeData();

  if (loading) {
    return (
      <Screen>
        <AppText color="textMuted">{t('common.loading')}</AppText>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <AppText variant="subtitle" color="error">
          {t('common.loadError')}
        </AppText>
        <Button label={t('common.retry')} onPress={reload} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <AppText variant="title">{t('home.title')}</AppText>
      <View style={{ gap: theme.spacing.md }}>
        {progress.map((item) => (
          <GradeCard key={item.grade} progress={item} />
        ))}
      </View>
      {currentGrade ? (
        <Button
          label={t('home.startQuiz')}
          onPress={() => router.push({ pathname: '/quiz', params: { grade: currentGrade } })}
        />
      ) : (
        <AppText color="success">{t('home.allDone')}</AppText>
      )}
    </Screen>
  );
}
