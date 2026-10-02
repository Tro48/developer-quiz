import { describe, expect, it } from 'vitest';
import { makeId, normalizeQuestionText } from '../tools/ids';

describe('normalizeQuestionText', () => {
  it('схлопывает пробелы, приводит регистр и кавычки', () => {
    expect(normalizeQuestionText('  Что   такое «замыкание»? ')).toBe('что такое "замыкание"?');
  });
});

describe('makeId', () => {
  it('детерминирован и учитывает тему', () => {
    const first = makeId('javascript', 'Что такое замыкание?');
    const second = makeId('javascript', 'Что такое замыкание?');
    const other = makeId('react', 'Что такое замыкание?');

    expect(first).toBe(second);
    expect(first).not.toBe(other);
    expect(first).toMatch(/^javascript-[0-9a-f]{8}$/);
  });
});
