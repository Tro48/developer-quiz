import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseYauhenkavalchuk } from '../tools/parse/yauhenkavalchuk';

const fixture = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/yauhenkavalchuk-js.md'),
  'utf8',
);

describe('parseYauhenkavalchuk', () => {
  const questions = parseYauhenkavalchuk(fixture, { source: 'yauhenkavalchuk', topicHint: 'javascript' });

  it('берёт только строки-ссылки на видео', () => {
    expect(questions).toHaveLength(3);
    expect(questions[1].question).toBe('Разница между `null` и `undefined`?');
    expect(questions[1].sourceUrl).toBe('https://youtu.be/G7hLwudGWL4?t=511');
  });

  it('заполняет источник, тему и статус без ответа', () => {
    expect(questions.every((q) => q.source === 'yauhenkavalchuk')).toBe(true);
    expect(questions.every((q) => q.topic === 'javascript')).toBe(true);
    expect(questions.every((q) => q.answer === '')).toBe(true);
    expect(questions.every((q) => q.status === 'parsed')).toBe(true);
    expect(questions.every((q) => q.grade === undefined)).toBe(true);
  });

  it('даёт стабильные уникальные id', () => {
    const ids = new Set(questions.map((q) => q.id));
    expect(ids.size).toBe(3);
    expect([...ids].every((id) => /^javascript-[0-9a-f]{8}$/.test(id))).toBe(true);
  });
});
