import { ScrollView, StyleSheet } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';

type Props = { code: string };

export function CodeBlock({ code }: Props) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator
      testID="code-block"
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.md,
          padding: theme.spacing.md,
        },
      ]}
    >
      <AppText
        selectable
        style={{
          fontFamily: theme.fontFamilies.mono,
          fontSize: theme.fontSizes.sm,
          lineHeight: theme.lineHeights.sm,
        }}
      >
        {code}
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { borderWidth: 1 },
});
