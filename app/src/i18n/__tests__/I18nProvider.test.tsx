import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { I18nProvider, useTranslation } from '@/i18n';

function Probe() {
  const { t } = useTranslation();
  return <Text>{t('home.startQuiz')}</Text>;
}

describe('I18nProvider', () => {
  it('переводит по ключу', async () => {
    await render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );
    expect(screen.getByText('Начать квиз')).toBeTruthy();
  });
});
