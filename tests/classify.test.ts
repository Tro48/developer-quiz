import { describe, expect, it } from 'vitest';
import { classifyAll, classifyQuestion } from '../tools/classify';
import type { ParsedQuestion } from '../tools/types';

const base: Omit<ParsedQuestion, 'id' | 'topic' | 'topicHint' | 'question'> = {
  source: 'hexlet',
  sourceUrl: 'https://example.com/frontend.md',
  answer: 'Ответ.',
  grade: 'junior',
  status: 'parsed',
};

function make(question: string, topicHint: string): ParsedQuestion {
  return {
    ...base,
    id: `unclassified-${question.length}`,
    topic: 'unclassified',
    topicHint,
    question,
  };
}

describe('classifyQuestion', () => {
  it('определяет тему по заголовку', () => {
    expect(classifyQuestion(make('a', 'Основы JavaScript')).topic).toBe('javascript');
    expect(classifyQuestion(make('ab', 'React')).topic).toBe('react');
    expect(classifyQuestion(make('abc', 'CSS')).topic).toBe('css');
  });

  it('не трогает уже классифицированные вопросы', () => {
    const question: ParsedQuestion = { ...make('abcd', 'React'), topic: 'javascript' };
    expect(classifyQuestion(question).topic).toBe('javascript');
  });

  it('неизвестный заголовок уходит в other', () => {
    expect(classifyQuestion(make('abcde', 'Кулинария')).topic).toBe('other');
  });

  it('не уводит «инфраструктуру» в алгоритмы', () => {
    expect(classifyQuestion(make('abcdef', 'Инструменты и инфраструктура')).topic).toBe('other');
  });
});

describe('classifyAll', () => {
  it('схлопывает дубли по id', () => {
    const first = make('Что такое замыкание?', 'JavaScript');
    const second: ParsedQuestion = { ...first, topicHint: 'JavaScript' };
    expect(classifyAll([first, second])).toHaveLength(1);
  });
});
