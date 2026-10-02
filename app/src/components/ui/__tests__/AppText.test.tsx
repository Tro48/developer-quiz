import { screen } from '@testing-library/react-native';

import { AppText } from '@/components/ui';
import { renderWithTheme } from '@/test-utils/renderWithTheme';

describe('AppText', () => {
  it('использует размер варианта title', async () => {
    await renderWithTheme(<AppText variant="title">Привет</AppText>);
    expect(screen.getByText('Привет')).toHaveStyle({ fontSize: 28 });
  });

  it('красит текст токеном темы', async () => {
    await renderWithTheme(<AppText color="error">Ошибка</AppText>);
    expect(screen.getByText('Ошибка')).toHaveStyle({ color: '#F85149' });
  });
});
