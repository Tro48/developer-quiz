import { Card, AppText } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/theme';

type Props = {
  correct: boolean;
  explanation: string;
};

export function ExplanationBox({ correct, explanation }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Card style={{ borderColor: correct ? theme.colors.success : theme.colors.error }}>
      <AppText variant="label" color={correct ? 'success' : 'error'}>
        {correct ? t('quiz.correct') : t('quiz.wrong')}
      </AppText>
      <AppText variant="caption" color="textMuted" style={{ marginTop: theme.spacing.xs }}>
        {t('quiz.explanation')}
      </AppText>
      <AppText>{explanation}</AppText>
    </Card>
  );
}
