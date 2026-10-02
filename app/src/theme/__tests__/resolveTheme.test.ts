import { darkTheme, resolveTheme } from '@/theme';

describe('resolveTheme', () => {
  it('возвращает тёмную тему', () => {
    expect(resolveTheme('dark')).toBe(darkTheme);
  });

  it('падает на тёмную, пока light не реализована', () => {
    expect(resolveTheme('light')).toBe(darkTheme);
  });
});
