import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { paths } from './paths';
import { parsedQuestionSchema } from './types';
import { readQuestionsFile } from './validate';

export type SeedOptions = {
  parsedPath?: string;
  questionsPath?: string;
};

async function readStore(filePath: string): Promise<unknown[]> {
  try {
    const raw = JSON.parse(await readFile(filePath, 'utf8')) as unknown;
    if (!Array.isArray(raw)) throw new Error(`Ожидался массив записей: ${filePath}`);
    return raw;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

// Добавляет в рабочую базу новые вопросы из parsed/all.json, не трогая уже
// существующие записи и их статусы. Идемпотентно.
export async function seedQuestions(
  opts: SeedOptions = {},
): Promise<{ added: number; total: number }> {
  const parsedPath = opts.parsedPath ?? path.join(paths.parsed, 'all.json');
  const questionsPath = opts.questionsPath ?? path.join(paths.generated, 'questions.json');

  const { questions: parsed, issues } = await readQuestionsFile(parsedPath, { missingIsError: true });
  if (issues.length > 0) {
    throw new Error(`Не удалось прочитать ${parsedPath}: ${issues.map((issue) => issue.message).join('; ')}`);
  }

  const store = await readStore(questionsPath);
  const known = new Set(
    store
      .map((question) => (question as { id?: unknown }).id)
      .filter((id): id is string => typeof id === 'string'),
  );

  const added = [];
  for (const question of parsed) {
    const candidate = parsedQuestionSchema.safeParse(question);
    if (!candidate.success) continue;
    if (known.has(candidate.data.id)) continue;
    known.add(candidate.data.id);
    added.push(candidate.data);
  }

  await mkdir(path.dirname(questionsPath), { recursive: true });
  const tempPath = `${questionsPath}.tmp`;
  await writeFile(tempPath, JSON.stringify([...store, ...added], null, 2), 'utf8');
  await rename(tempPath, questionsPath);

  return { added: added.length, total: store.length + added.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await seedQuestions();
  console.log(`Добавлено вопросов: ${result.added}, всего в рабочей базе: ${result.total}`);
}
