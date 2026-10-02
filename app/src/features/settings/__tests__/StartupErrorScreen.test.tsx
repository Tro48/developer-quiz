import { fireEvent, screen } from '@testing-library/react-native';

import { StartupErrorScreen } from '@/features/settings/StartupErrorScreen';
import { I18nProvider } from '@/i18n';
import { renderWithTheme } from '@/test-utils/renderWithTheme';

describe('StartupErrorScreen', () => {
  it('показывает ошибку и вызывает повтор', async () => {
    const onRetry = jest.fn();
    await renderWithTheme(
      <I18nProvider>
        <StartupErrorScreen onRetry={onRetry} />
      </I18nProvider>
    );

    expect(screen.getByText('Не удалось открыть базу данных')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Повторить' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
