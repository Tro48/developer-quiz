import { describe, expect, it } from 'vitest';
import { validateBankQuestions } from '../tools/validate';

const validQuestion = {
  id: 'javascript-deadbeef',
  topic: 'javascript',
  source: 'hexlet',
  sourceUrl: 'https://example.com/frontend.md',
  question: 'Что такое замыкание?',
  answer: 'Функция вместе с её лексическим окружением.',
  grade: 'junior',
  options: ['Вариант А', 'Вариант Б', 'Вариант В', 'Вариант Г'],
  correctIndex: 0,
  explanation: 'Замыкание сохраняет доступ к внешней области видимости.',
  docsRefs: ['https://developer.mozilla.org/ru/docs/Web/JavaScript/Closures'],
  status: 'verified',
};

describe('validateBankQuestions', () => {
  it('пропускает корректный вопрос', () => {
    expect(validateBankQuestions([validQuestion])).toEqual([]);
  });

  it('находит дубликат id', () => {
    const issues = validateBankQuestions([validQuestion, { ...validQuestion }]);
    expect(issues.some((issue) => issue.message.includes('дубликат'))).toBe(true);
  });

  it('находит повторяющиеся варианты', () => {
    const issues = validateBankQuestions([
      { ...validQuestion, options: ['Один', 'один ', 'Два', 'Три'] },
    ]);
    expect(issues.some((issue) => issue.message.includes('повторяются'))).toBe(true);
  });

  it('ловит нарушение схемы', () => {
    const issues = validateBankQuestions([{ ...validQuestion, docsRefs: [] }]);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('схему банка');
  });
});
