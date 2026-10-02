import { makeId } from './ids';
import type { ParsedQuestion } from './types';

// Правила сопоставления заголовков источника каноническим темам.
// Порядок важен: первое совпадение выигрывает.
const TOPIC_RULES: [RegExp, string][] = [
  [/typescript|\bts\b/i, 'typescript'],
  [/react|redux|mobx|хук/i, 'react'],
  [/javascript|event loop|промис|async|\bjs\b/i, 'javascript'],
  [/css|flexbox|grid|вёрстк/i, 'css'],
  [/html|семантик/i, 'html'],
  [/алгоритм|структур.*данн/i, 'algorithms'],
  [/сет|http|браузер|network/i, 'web'],
  [/soft skills|мотивац|опыт/i, 'soft-skills'],
];

export function classifyQuestion(question: ParsedQuestion): ParsedQuestion {
  if (question.topic !== 'unclassified') return question;

  const hint = (question.topicHint ?? '').toLowerCase();
  const match = TOPIC_RULES.find(([pattern]) => pattern.test(hint));
  const topic = match?.[1] ?? 'other';
  // id зависит от темы: после классификации пересчитываем его, чтобы
  // соблюдался формат <topic>-<sha1_8> и кросс-источниковые дубли схлопывались.
  return { ...question, topic, id: makeId(topic, question.question) };
}

export function classifyAll(questions: ParsedQuestion[]): ParsedQuestion[] {
  const byId = new Map<string, ParsedQuestion>();

  for (const question of questions) {
    const classified = classifyQuestion(question);
    // Дубли схлопываем по id: id уже нормализует текст вопроса.
    if (!byId.has(classified.id)) byId.set(classified.id, classified);
  }

  return [...byId.values()];
}
