import { fireEvent, screen } from '@testing-library/react-native';

import { Button } from '@/components/ui';
import { renderWithTheme } from '@/test-utils/renderWithTheme';

describe('Button', () => {
  it('вызывает onPress', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Начать" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Начать' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('не вызывает onPress, когда disabled', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Начать" onPress={onPress} disabled />);

    await fireEvent.press(screen.getByRole('button', { name: 'Начать' }));

    expect(onPress).not.toHaveBeenCalled();
  });
});
