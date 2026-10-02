import { makeId } from '../ids';
import type { ParsedQuestion } from '../types';

export type YauhenkavalchukOptions = {
  source: string;
  topicHint: string;
};

// Формат источника: markdown-список "- [текст вопроса](ссылка на видео)".
// Текстовых ответов в источнике нет — answer пустой, грейд проставит агент.
export function parseYauhenkavalchuk(
  markdown: string,
  opts: YauhenkavalchukOptions,
): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  const lineRe = /^- \[(.+?)\]\((https?:\/\/[^)]+)\)\s*$/;

  for (const rawLine of markdown.split('\n')) {
    const match = lineRe.exec(rawLine.trim());
    if (!match) continue;

    const question = match[1].trim();
    const sourceUrl = match[2].trim();

    questions.push({
      id: makeId(opts.topicHint, question),
      topic: opts.topicHint,
      topicHint: opts.topicHint,
      source: opts.source,
      sourceUrl,
      question,
      answer: '',
      status: 'parsed',
    });
  }

  return questions;
}
