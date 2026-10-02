import { ru } from '@/i18n/ru';
import { translate, type TranslationKey } from '@/i18n/translate';

describe('translate', () => {
  it('подставляет параметры', () => {
    expect(translate(ru, 'quiz.progress', { current: 2, total: 15 })).toBe('Вопрос 2 из 15');
  });

  it('возвращает ключ, если перевода нет', () => {
    expect(translate(ru, 'nope.missing' as TranslationKey)).toBe('nope.missing');
  });

  it('оставляет неизвестный параметр как есть', () => {
    expect(translate({ x: '{a} и {b}' }, 'x', { a: '1' })).toBe('1 и {b}');
  });
});
