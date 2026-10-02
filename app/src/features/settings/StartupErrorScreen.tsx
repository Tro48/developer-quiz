import { AppText, Button, Screen } from '@/components/ui';
import { useTranslation } from '@/i18n';

type Props = { onRetry: () => void };

export function StartupErrorScreen({ onRetry }: Props) {
  const { t } = useTranslation();

  return (
    <Screen>
      <AppText variant="subtitle" color="error">
        {t('common.startupError')}
      </AppText>
      <AppText color="textMuted">{t('common.error')}</AppText>
      <Button label={t('common.retry')} onPress={onRetry} />
    </Screen>
  );
}
