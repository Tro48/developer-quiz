import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { paths } from './paths';
import { generatedQuestionSchema, parsedQuestionSchema } from './types';

export type ReportQuestion = {
  status: string;
  topic: string;
  grade?: string;
};

// Markdown-сводка: статусы, темы и грейды (verified / всего).
export function buildReport(questions: ReportQuestion[]): string {
  type Counter = { total: number; verified: number };
  const byStatus = new Map<string, number>();
  const byTopic = new Map<string, Counter>();
  const byGrade = new Map<string, Counter>();

  const bump = (map: Map<string, Counter>, key: string, verified: boolean) => {
    const entry = map.get(key) ?? { total: 0, verified: 0 };
    entry.total += 1;
    if (verified) entry.verified += 1;
    map.set(key, entry);
  };

  for (const question of questions) {
    const verified = question.status === 'verified';
    byStatus.set(question.status, (byStatus.get(question.status) ?? 0) + 1);
    bump(byTopic, question.topic, verified);
    bump(byGrade, question.grade ?? 'не задан', verified);
  }

  const lines = [
    '# Отчёт по банку вопросов',
    '',
    `Всего записей: ${questions.length}`,
    '',
    '## По статусам',
    '',
  ];
  for (const [status, count] of [...byStatus.entries()].sort()) {
    lines.push(`- ${status}: ${count}`);
  }

  lines.push('', '## По темам (verified / всего)', '');
  for (const [topic, entry] of [...byTopic.entries()].sort()) {
    lines.push(`- ${topic}: ${entry.verified} / ${entry.total}`);
  }

  lines.push('', '## По грейдам (verified / всего)', '');
  for (const [grade, entry] of [...byGrade.entries()].sort()) {
    lines.push(`- ${grade}: ${entry.verified} / ${entry.total}`);
  }

  return lines.join('\n');
}

export function toReportQuestions(questions: unknown[]): ReportQuestion[] {
  const result: ReportQuestion[] = [];
  for (const question of questions) {
    const generated = generatedQuestionSchema.safeParse(question);
    if (generated.success) {
      result.push({
        status: generated.data.status,
        topic: generated.data.topic,
        grade: generated.data.grade,
      });
      continue;
    }
    const parsed = parsedQuestionSchema.safeParse(question);
    if (parsed.success) {
      result.push({ status: parsed.data.status, topic: parsed.data.topic, grade: parsed.data.grade });
    }
  }
  return result;
}

async function readJsonArray(filePath: string): Promise<unknown[]> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as unknown[];
  } catch {
    return [];
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const store = await readJsonArray(path.join(paths.generated, 'questions.json'));
  console.log(buildReport(toReportQuestions(store)));
}
