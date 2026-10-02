import { screen } from '@testing-library/react-native';

import { AppText, Card } from '@/components/ui';
import { renderWithTheme } from '@/test-utils/renderWithTheme';

describe('Card', () => {
  it('рендерит содержимое', async () => {
    await renderWithTheme(
      <Card>
        <AppText>Внутри</AppText>
      </Card>
    );
    expect(screen.getByText('Внутри')).toBeTruthy();
  });
});
