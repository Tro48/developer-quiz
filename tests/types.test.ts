import { describe, expect, it } from 'vitest';
import { generatedQuestionSchema, parsedQuestionSchema } from '../tools/types';

const base = {
  id: 'javascript-deadbeef',
  topic: 'javascript',
  source: 'hexlet',
  sourceUrl: 'https://example.com/frontend.md',
  question: 'Что такое замыкание?',
  answer: 'Функция вместе с её лексическим окружением.',
};

describe('parsedQuestionSchema', () => {
  it('принимает корректный вопрос', () => {
    expect(parsedQuestionSchema.parse({ ...base, status: 'parsed' })).toBeTruthy();
  });

  it('отклоняет неверный грейд', () => {
    const result = parsedQuestionSchema.safeParse({ ...base, status: 'parsed', grade: 'lead' });
    expect(result.success).toBe(false);
  });
});

describe('generatedQuestionSchema', () => {
  it('требует ровно 4 варианта и непустые docsRefs', () => {
    const valid = generatedQuestionSchema.safeParse({
      ...base,
      grade: 'junior',
      options: ['А', 'Б', 'В', 'Г'],
      correctIndex: 0,
      explanation: 'Замыкание сохраняет доступ к внешней области видимости.',
      docsRefs: ['https://developer.mozilla.org/ru/docs/Web/JavaScript/Closures'],
      status: 'generated',
    });
    expect(valid.success).toBe(true);

    const shortOptions = generatedQuestionSchema.safeParse({
      ...base,
      grade: 'junior',
      options: ['А', 'Б', 'В'],
      correctIndex: 0,
      explanation: 'Пояснение.',
      docsRefs: ['https://developer.mozilla.org/ru/docs/Web/JavaScript/Closures'],
      status: 'generated',
    });
    expect(shortOptions.success).toBe(false);

    const noRefs = generatedQuestionSchema.safeParse({
      ...base,
      grade: 'junior',
      options: ['А', 'Б', 'В', 'Г'],
      correctIndex: 0,
      explanation: 'Пояснение.',
      docsRefs: [],
      status: 'generated',
    });
    expect(noRefs.success).toBe(false);
  });
});
