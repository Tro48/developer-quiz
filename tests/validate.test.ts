import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readQuestionsFile, validateBankQuestions, validateVerified } from '../tools/validate';

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

describe('validateVerified', () => {
  it('находит нарушение схемы у записи с сырым статусом verified', () => {
    const issues = validateVerified([{ ...validQuestion, docsRefs: [] }]);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('схему банка');
  });

  it('не трогает записи с другими статусами', () => {
    const issues = validateVerified([{ ...validQuestion, status: 'generated', docsRefs: [] }]);
    expect(issues).toEqual([]);
  });
});

describe('readQuestionsFile', () => {
  it('отсутствующий файл — пустая база без проблем', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'dq-validate-'));
    const result = await readQuestionsFile(path.join(dir, 'нет.json'));
    expect(result).toEqual({ questions: [], issues: [] });
  });

  it('битый JSON — issue, а не зелёная проверка', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'dq-validate-'));
    const filePath = path.join(dir, 'questions.json');
    await writeFile(filePath, '{ сломано', 'utf8');

    const result = await readQuestionsFile(filePath);
    expect(result.questions).toEqual([]);
    expect(result.issues[0].message).toContain('разобрать JSON');
  });

  it('не массив — issue', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'dq-validate-'));
    const filePath = path.join(dir, 'questions.json');
    await writeFile(filePath, JSON.stringify({ foo: 'bar' }), 'utf8');

    const result = await readQuestionsFile(filePath);
    expect(result.issues[0].message).toContain('массив');
  });
});
