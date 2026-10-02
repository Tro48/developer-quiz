import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ThemeProvider, useTheme } from '@/theme';

function Probe() {
  const theme = useTheme();
  return <Text>{theme.colors.background}</Text>;
}

describe('ThemeProvider', () => {
  it('даёт тёмную тему по умолчанию', async () => {
    await render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    expect(screen.getByText('#0F1115')).toBeTruthy();
  });
});
