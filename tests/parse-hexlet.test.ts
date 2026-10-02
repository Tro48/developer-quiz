import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseHexlet } from '../tools/parse/hexlet';

const fixture = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/hexlet-frontend.md'),
  'utf8',
);

const sourceUrl =
  'https://raw.githubusercontent.com/Hexlet/ru-interview-questions/main/questions/frontend.md';

describe('parseHexlet', () => {
  const questions = parseHexlet(fixture, { source: 'hexlet', sourceUrl });

  it('берёт только вопросы с ответами в details', () => {
    expect(questions).toHaveLength(3);
    expect(questions[0].answer).toContain('алгоритмическую базу');
    expect(questions[0].answer).not.toContain('<summary>');
    expect(questions.some((q) => q.question.includes('Вопрос без ответа'))).toBe(false);
  });

  it('проставляет грейд по разделу и сохраняет подсказку темы', () => {
    expect(questions.filter((q) => q.grade === 'junior')).toHaveLength(2);
    expect(questions.filter((q) => q.grade === 'middle')).toHaveLength(1);
    expect(questions.some((q) => q.topicHint === 'Основы JavaScript')).toBe(true);
  });

  it('оставляет тему неклассифицированной до отдельного шага', () => {
    expect(questions.every((q) => q.topic === 'unclassified')).toBe(true);
    expect(questions.every((q) => q.source === 'hexlet')).toBe(true);
    expect(questions.every((q) => q.sourceUrl === sourceUrl)).toBe(true);
  });
});
