import type { PropsWithChildren } from 'react';
import { Text, type TextProps } from 'react-native';

import { useTheme, type Theme } from '@/theme';

export type TextVariant = 'title' | 'subtitle' | 'body' | 'caption' | 'label';

type VariantStyle = {
  fontSize: keyof Theme['fontSizes'];
  fontWeight: keyof Theme['fontWeights'];
  lineHeight: keyof Theme['lineHeights'];
};

const variantStyles: Record<TextVariant, VariantStyle> = {
  title: { fontSize: 'xl', fontWeight: 'bold', lineHeight: 'xl' },
  subtitle: { fontSize: 'lg', fontWeight: 'semibold', lineHeight: 'lg' },
  body: { fontSize: 'md', fontWeight: 'regular', lineHeight: 'md' },
  caption: { fontSize: 'sm', fontWeight: 'regular', lineHeight: 'sm' },
  label: { fontSize: 'sm', fontWeight: 'semibold', lineHeight: 'sm' },
};

type Props = PropsWithChildren<
  TextProps & {
    variant?: TextVariant;
    color?: keyof Theme['colors'];
  }
>;

export function AppText({ variant = 'body', color = 'textPrimary', style, children, ...rest }: Props) {
  const theme = useTheme();
  const variantStyle = variantStyles[variant];

  return (
    <Text
      {...rest}
      style={[
        {
          fontSize: theme.fontSizes[variantStyle.fontSize],
          fontWeight: theme.fontWeights[variantStyle.fontWeight],
          lineHeight: theme.lineHeights[variantStyle.lineHeight],
          color: theme.colors[color],
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
