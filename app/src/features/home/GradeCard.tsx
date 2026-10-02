import { StyleSheet, View } from 'react-native';

import { AppText, Card, ProgressBar } from '@/components/ui';
import type { GradeProgress } from '@/domain/progress';
import { useTranslation } from '@/i18n';

type Props = { progress: GradeProgress };

export function GradeCard({ progress }: Props) {
  const { t } = useTranslation();
  const ratio = progress.total > 0 ? progress.solved / progress.total : 0;

  return (
    <Card style={progress.unlocked ? undefined : styles.locked}>
      <View style={styles.header}>
        <AppText variant="subtitle">{t(`grades.${progress.grade}`)}</AppText>
        {progress.complete ? (
          <AppText variant="label" color="success">
            {t('home.locked')}
          </AppText>
        ) : null}
      </View>
      <AppText variant="caption" color="textMuted">
        {t('home.solvedOf', { solved: progress.solved, total: progress.total })}
      </AppText>
      <ProgressBar value={ratio} />
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  locked: { opacity: 0.6 },
});
