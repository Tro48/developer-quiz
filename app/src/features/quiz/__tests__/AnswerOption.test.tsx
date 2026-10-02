import { fireEvent, screen } from '@testing-library/react-native';

import { AnswerOption } from '@/features/quiz/AnswerOption';
import { renderWithTheme } from '@/test-utils/renderWithTheme';

describe('AnswerOption', () => {
  it('нажимается в состоянии idle', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<AnswerOption label="Вариант" state="idle" onPress={onPress} />);

    await fireEvent.press(screen.getByText('Вариант'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('не нажимается после ответа', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<AnswerOption label="Вариант" state="muted" onPress={onPress} />);

    await fireEvent.press(screen.getByText('Вариант'));

    expect(onPress).not.toHaveBeenCalled();
  });
});
