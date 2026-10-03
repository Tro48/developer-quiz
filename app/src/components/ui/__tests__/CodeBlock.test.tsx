import { screen } from '@testing-library/react-native';

import { CodeBlock } from '@/components/ui';
import { fontFamilies } from '@/theme';
import { renderWithTheme } from '@/test-utils/renderWithTheme';

const code = 'function sum(a, b) {\n  return a + b;\n}';

describe('CodeBlock', () => {
  it('рендерит код дословно, сохраняя переводы строк и отступы', async () => {
    await renderWithTheme(<CodeBlock code={code} />);

    expect(screen.getByText(code)).toBeTruthy();
  });

  it('использует моноширинный шрифт и подложку темы', async () => {
    await renderWithTheme(<CodeBlock code={code} />);

    expect(screen.getByText(code)).toHaveStyle({ fontFamily: fontFamilies.mono });
    expect(screen.getByTestId('code-block')).toHaveStyle({ backgroundColor: '#1F242D' });
  });
});
