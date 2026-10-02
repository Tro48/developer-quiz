import { describe, expect, it } from 'vitest';
import { classifyAll, classifyQuestion } from '../tools/classify';
import { isKnownTopic } from '../tools/taxonomy';
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
    expect(classifyQuestion(make('abcdef', 'Инструменты и инфраструктура')).topic).toBe('tools');
  });

  it('относит Git и инструменты к tools', () => {
    expect(classifyQuestion(make('xyz', 'Git и процессы разработки')).topic).toBe('tools');
    expect(classifyQuestion(make('xyzw', 'Инструменты и инфраструктура')).topic).toBe('tools');
  });

  it('все известные заголовки дают канонические темы', () => {
    const headings = [
      'Основы JavaScript',
      'React и состояние приложения',
      'TypeScript',
      'Frontend и верстка (HTML/CSS)',
      'Общие вопросы (Soft Skills, опыт и мотивация)',
      'Git и процессы разработки',
      'Инструменты и инфраструктура',
      'Кулинария',
    ];
    for (const heading of headings) {
      expect(isKnownTopic(classifyQuestion(make(`q${heading.length}`, heading)).topic)).toBe(true);
    }
  });
});

describe('classifyAll', () => {
  it('схлопывает дубли по id', () => {
    const first = make('Что такое замыкание?', 'JavaScript');
    const second: ParsedQuestion = { ...first, topicHint: 'JavaScript' };
    expect(classifyAll([first, second])).toHaveLength(1);
  });
});
