import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { paths } from './paths';
import { contentKey } from './topic-overrides';
import { parsedQuestionSchema } from './types';
import { readQuestionsFile } from './validate';

export type SeedOptions = {
  parsedPath?: string;
  questionsPath?: string;
};

export type SeedResult = {
  added: number;
  migrated: number;
  total: number;
};

type StoredQuestion = {
  id?: unknown;
  topic?: unknown;
  topicHint?: unknown;
  question?: unknown;
  source?: unknown;
  sourceUrl?: unknown;
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
// существующие записи и их статусы. Если у существующего вопроса сменилась тема
// (и вместе с ней id), переносит запись на новый id. Идемпотентно.
export async function seedQuestions(opts: SeedOptions = {}): Promise<SeedResult> {
  const parsedPath = opts.parsedPath ?? path.join(paths.parsed, 'all.json');
  const questionsPath = opts.questionsPath ?? path.join(paths.generated, 'questions.json');

  const { questions: parsed, issues } = await readQuestionsFile(parsedPath, { missingIsError: true });
  if (issues.length > 0) {
    throw new Error(`Не удалось прочитать ${parsedPath}: ${issues.map((issue) => issue.message).join('; ')}`);
  }

  const store = await readStore(questionsPath);
  const indexById = new Map<string, number>();
  const indexByContent = new Map<string, number>();
  store.forEach((question, index) => {
    const stored = question as StoredQuestion;
    if (typeof stored.id === 'string' && !indexById.has(stored.id)) {
      indexById.set(stored.id, index);
    }
    const key = contentKey(stored);
    if (key && !indexByContent.has(key)) {
      indexByContent.set(key, index);
    }
  });

  let added = 0;
  let migrated = 0;

  for (const question of parsed) {
    const candidate = parsedQuestionSchema.safeParse(question);
    if (!candidate.success) continue;
    const record = candidate.data;

    if (indexById.has(record.id)) continue;

    const key = contentKey(record);
    const existingIndex = key ? indexByContent.get(key) : undefined;

    if (existingIndex === undefined) {
      store.push(record);
      indexById.set(record.id, store.length - 1);
      if (key) indexByContent.set(key, store.length - 1);
      added += 1;
      continue;
    }

    const existing = store[existingIndex] as StoredQuestion;
    if (existing.id !== record.id || existing.topic !== record.topic) {
      store[existingIndex] = {
        ...(store[existingIndex] as Record<string, unknown>),
        id: record.id,
        topic: record.topic,
        topicHint: record.topicHint,
      };
      if (typeof existing.id === 'string') indexById.delete(existing.id);
      indexById.set(record.id, existingIndex);
      migrated += 1;
    }
  }

  await mkdir(path.dirname(questionsPath), { recursive: true });
  const tempPath = `${questionsPath}.tmp`;
  await writeFile(tempPath, JSON.stringify(store, null, 2), 'utf8');
  await rename(tempPath, questionsPath);

  return { added, migrated, total: store.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await seedQuestions();
  console.log(
    `Добавлено вопросов: ${result.added}, перенесено при смене темы: ${result.migrated}, всего в рабочей базе: ${result.total}`,
  );
}
