import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui';
import { useTheme, type Theme } from '@/theme';

export type AnswerState = 'idle' | 'correct' | 'wrong' | 'muted';

const borderTokens: Record<AnswerState, keyof Theme['colors']> = {
  idle: 'border',
  correct: 'success',
  wrong: 'error',
  muted: 'border',
};

type Props = {
  label: string;
  state: AnswerState;
  onPress: () => void;
};

export function AnswerOption({ label, state, onPress }: Props) {
  const theme = useTheme();
  const interactive = state === 'idle';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!interactive}
      onPress={onPress}
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors[borderTokens[state]],
          borderRadius: theme.radii.md,
          opacity: state === 'muted' ? 0.5 : 1,
        },
      ]}
    >
      <AppText>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
