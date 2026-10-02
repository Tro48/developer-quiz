import { screen } from '@testing-library/react-native';

import { ProgressBar } from '@/components/ui';
import { renderWithTheme } from '@/test-utils/renderWithTheme';

describe('ProgressBar', () => {
  it('задаёт ширину заполнения по значению', async () => {
    await renderWithTheme(<ProgressBar value={0.5} />);
    expect(screen.getByTestId('progress-fill')).toHaveStyle({ width: '50%' });
  });

  it('ограничивает значение диапазоном 0..1', async () => {
    await renderWithTheme(<ProgressBar value={1.5} />);
    expect(screen.getByTestId('progress-fill')).toHaveStyle({ width: '100%' });
  });
});
