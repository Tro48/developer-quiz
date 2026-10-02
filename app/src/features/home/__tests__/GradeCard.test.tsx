import { screen } from '@testing-library/react-native';

import { GradeCard } from '@/features/home/GradeCard';
import { I18nProvider } from '@/i18n';
import { renderWithTheme } from '@/test-utils/renderWithTheme';

describe('GradeCard', () => {
  it('показывает грейд, счёт и прогресс', async () => {
    await renderWithTheme(
      <I18nProvider>
        <GradeCard progress={{ grade: 'junior', solved: 3, total: 10, complete: false, unlocked: true }} />
      </I18nProvider>
    );

    expect(screen.getByText('Junior')).toBeTruthy();
    expect(screen.getByText('Решено 3 из 10')).toBeTruthy();
    expect(screen.getByTestId('progress-fill')).toHaveStyle({ width: '30%' });
  });

  it('помечает закрытый грейд', async () => {
    await renderWithTheme(
      <I18nProvider>
        <GradeCard progress={{ grade: 'middle', solved: 5, total: 5, complete: true, unlocked: true }} />
      </I18nProvider>
    );

    expect(screen.getByText('Закрыто')).toBeTruthy();
  });
});
