import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppText, Button, Screen } from '@/components/ui';
import { isGrade, type Grade } from '@/domain/types';
import { useTranslation } from '@/i18n';

import { parseScore } from './parseScore';

export function ResultScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ correct?: string; total?: string; grade?: string }>();
  const { correct, total } = parseScore(params);
  const grade: Grade = params.grade && isGrade(params.grade) ? params.grade : 'junior';

  return (
    <Screen>
      <AppText variant="title">{t('result.title')}</AppText>
      <AppText variant="subtitle">{t('result.score', { correct, total })}</AppText>
      <Button
        label={t('result.newQuiz')}
        onPress={() => router.replace({ pathname: '/quiz', params: { grade } })}
      />
      <Button label={t('result.home')} variant="secondary" onPress={() => router.replace('/')} />
    </Screen>
  );
}
