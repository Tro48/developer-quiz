import { useEffect } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, ProgressBar, Screen } from '@/components/ui';
import { isGrade } from '@/domain/types';
import { useTranslation } from '@/i18n';

import { AnswerOption, type AnswerState } from './AnswerOption';
import { ExplanationBox } from './ExplanationBox';
import { useQuizSession } from './useQuizSession';

function optionState(
  index: number,
  selectedIndex: number | null,
  correctIndex: number
): AnswerState {
  if (selectedIndex === null) {
    return 'idle';
  }
  if (index === correctIndex) {
    return 'correct';
  }
  return index === selectedIndex ? 'wrong' : 'muted';
}

export function QuizScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ grade?: string }>();
  const grade = params.grade && isGrade(params.grade) ? params.grade : 'junior';
  const { state, loading, error, answer, next, reload } = useQuizSession(grade);

  useEffect(() => {
    if (state.phase === 'finished') {
      // Экран /result появится в задаче 10 — до этого typed routes не знает маршрут,
      // поэтому каст временный; после его появления каст снимается.
      const resultHref = {
        pathname: '/result',
        params: { correct: state.correctCount, total: state.questions.length, grade },
      } as unknown as Href;
      router.replace(resultHref);
    }
  }, [state.phase, state.correctCount, state.questions.length, grade, router]);

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

  const question = state.questions[state.index];
  if (!question) {
    return (
      <Screen>
        <AppText color="success">{t('home.allDone')}</AppText>
      </Screen>
    );
  }

  const selectedIndex = state.selectedIndex;

  return (
    <Screen scroll>
      <AppText variant="caption" color="textMuted">
        {t('quiz.progress', { current: state.index + 1, total: state.questions.length })}
      </AppText>
      <ProgressBar value={(state.index + 1) / state.questions.length} />
      <AppText variant="subtitle">{question.question}</AppText>
      <View style={styles.options}>
        {question.options.map((option, index) => (
          <AnswerOption
            key={option}
            label={option}
            state={optionState(index, selectedIndex, question.correctIndex)}
            onPress={() => answer(index)}
          />
        ))}
      </View>
      {selectedIndex !== null && state.phase === 'feedback' ? (
        <ExplanationBox
          correct={selectedIndex === question.correctIndex}
          explanation={question.explanation}
        />
      ) : null}
      {state.phase === 'feedback' ? (
        <Button
          label={state.index + 1 === state.questions.length ? t('quiz.finish') : t('quiz.next')}
          onPress={next}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  options: { gap: 8 },
});
