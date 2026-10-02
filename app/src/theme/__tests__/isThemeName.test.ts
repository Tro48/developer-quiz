import { isThemeName } from '@/theme';

describe('isThemeName', () => {
  it('принимает известные темы', () => {
    expect(isThemeName('dark')).toBe(true);
    expect(isThemeName('light')).toBe(true);
  });

  it('отклоняет мусор из базы', () => {
    expect(isThemeName('blue')).toBe(false);
  });
});
