import { makeId } from '../ids';
import type { ParsedQuestion } from '../types';

export type HexletOptions = {
  source: string;
  sourceUrl: string;
};

type Grade = 'junior' | 'middle' | 'senior';

const GRADE_BY_HEADING: Record<string, Grade> = {
  junior: 'junior',
  middle: 'middle',
  senior: 'senior',
};

// Формат источника: "## Junior|Middle|Senior", темы через "###",
// вопросы списком, ответы в <details><summary>Ответ</summary>...</details>.
export function parseHexlet(markdown: string, opts: HexletOptions): ParsedQuestion[] {
  const lines = markdown.split('\n');
  const questions: ParsedQuestion[] = [];

  let grade: Grade | null = null;
  let topicHint = '';
  let questionLines: string[] | null = null;
  let answerLines: string[] | null = null;
  let inDetails = false;

  const flush = () => {
    if (grade && questionLines) {
      const question = questionLines.join(' ').trim();
      const answer = answerLines ? answerLines.join('\n').trim() : '';
      if (question && answer) {
        questions.push({
          id: makeId('unclassified', question),
          topic: 'unclassified',
          topicHint,
          grade,
          source: opts.source,
          sourceUrl: opts.sourceUrl,
          question,
          answer,
          status: 'parsed',
        });
      }
    }
    questionLines = null;
    answerLines = null;
    inDetails = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    const gradeMatch = /^##\s+(Junior|Middle|Senior)\s*$/i.exec(line);
    if (gradeMatch) {
      flush();
      grade = GRADE_BY_HEADING[gradeMatch[1].toLowerCase()] ?? null;
      topicHint = '';
      continue;
    }

    if (/^##\s+/.test(line)) {
      flush();
      continue;
    }

    const topicMatch = /^###\s+(.+)$/.exec(line);
    if (topicMatch) {
      flush();
      topicHint = topicMatch[1].trim();
      continue;
    }

    if (line.startsWith('<details>')) {
      inDetails = true;
      answerLines = answerLines ?? [];
      continue;
    }

    if (line.startsWith('</details>')) {
      inDetails = false;
      continue;
    }

    if (inDetails) {
      if (!/^<summary>/.test(line)) answerLines?.push(rawLine);
      continue;
    }

    const bulletMatch = /^-\s+(.+)$/.exec(line);
    if (bulletMatch) {
      flush();
      questionLines = [bulletMatch[1].trim()];
      continue;
    }

    if (questionLines && line && !line.startsWith('#')) {
      questionLines.push(line);
    }
  }

  flush();
  return questions;
}
