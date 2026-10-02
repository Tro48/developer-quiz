import { Pressable, StyleSheet } from 'react-native';

import { useTheme, type Theme } from '@/theme';

import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary';

const variantTokens: Record<
  ButtonVariant,
  { background: keyof Theme['colors']; text: keyof Theme['colors'] }
> = {
  primary: { background: 'accent', text: 'onAccent' },
  secondary: { background: 'surfaceElevated', text: 'textPrimary' },
};

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
};

export function Button({ label, onPress, variant = 'primary', disabled = false }: Props) {
  const theme = useTheme();
  const tokens = variantTokens[variant];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.root,
        {
          backgroundColor: theme.colors[tokens.background],
          borderRadius: theme.radii.md,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <AppText variant="label" color={tokens.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 20,
  },
});
