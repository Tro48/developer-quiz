import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

type Props = { value: number };

export function ProgressBar({ value }: Props) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, value));

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radii.pill },
      ]}
    >
      <View
        testID="progress-fill"
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          backgroundColor: theme.colors.accent,
          borderRadius: theme.radii.pill,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, overflow: 'hidden', width: '100%' },
});
