import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { makeId } from './ids';
import { idsInBatches, readJson, uniqueBatchId, writeJson } from './io';
import { paths } from './paths';
import { isKnownTopic } from './taxonomy';
import { contentKey, loadTopicOverrides, overrideKey, saveTopicOverrides } from './topic-overrides';
import type { TopicOverride } from './topic-overrides';
import { parsedQuestionSchema } from './types';

export type TopicfixOptions = {
  hint?: string;
  size?: number;
  questionsPath?: string;
  overridesPath?: string;
  batchesDir?: string;
  now?: Date;
};

export const DEFAULT_MIXED_HINT = 'Frontend и верстка (HTML/CSS)';

const topicfixOutputSchema = z.object({
  batchId: z.string().min(1),
  assignments: z.array(
    z.object({
      id: z.string().regex(/^[a-z0-9-]+-[0-9a-f]{8}$/),
      topic: z.string().min(1),
    }),
  ),
});

async function readStore(filePath: string): Promise<unknown[]> {
  return (await readJson<unknown[]>(filePath)) ?? [];
}

// Контент вопросов, уже встречавшихся в topicfix-батчах: id после merge меняется,
// поэтому повторную выдачу исключаем по источнику и тексту.
async function contentKeysInBatches(batchesDir: string): Promise<Set<string>> {
  const dir = path.join(batchesDir, 'topicfix');
  let files: string[] = [];
  try {
    files = await readdir(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Set();
    throw error;
  }

  const keys = new Set<string>();
  for (const file of files) {
    if (!file.endsWith('.input.json') && !file.endsWith('.output.json')) continue;
    const content = await readJson<{ questions?: unknown[] }>(path.join(dir, file));
    for (const question of content?.questions ?? []) {
      const key = contentKey(question as { source?: unknown; sourceUrl?: unknown; question?: unknown });
      if (key) keys.add(key);
    }
  }
  return keys;
}

// Выбирает parsed-вопросы смешанной секции, ещё не встречавшиеся в topicfix-батчах.
export async function emitTopicfixBatch(
  opts: TopicfixOptions = {},
): Promise<{ batchId: string; inputPath: string } | null> {
  const batchesDir = opts.batchesDir ?? paths.batches;
  const questionsPath = opts.questionsPath ?? path.join(paths.generated, 'questions.json');
  const hint = opts.hint ?? DEFAULT_MIXED_HINT;
  const size = opts.size ?? 30;
  const store = await readStore(questionsPath);
  const used = await idsInBatches('topicfix', batchesDir);
  const usedContent = await contentKeysInBatches(batchesDir);
  const selected = store
    .filter((record) => {
      const item = record as {
        id?: unknown;
        status?: unknown;
        topicHint?: unknown;
        source?: unknown;
        sourceUrl?: unknown;
        question?: unknown;
      };
      const key = contentKey(item);
      return (
        item.status === 'parsed' &&
        item.topicHint === hint &&
        typeof item.id === 'string' &&
        !used.has(item.id) &&
        (!key || !usedContent.has(key))
      );
    })
    .slice(0, size);

  if (selected.length === 0) return null;

  const batchId = await uniqueBatchId('topicfix', opts.now ?? new Date(), batchesDir);
  const inputPath = path.join(batchesDir, 'topicfix', `${batchId}.input.json`);
  await writeJson(inputPath, {
    batchId,
    kind: 'topicfix',
    prompt: 'tools/prompts/topicfix.md',
    hint,
    questions: selected,
  });
  return { batchId, inputPath };
}

// Переносит запись на id новой темы, сохраняя статус и содержимое; занятый id — коллизия.
export async function mergeTopicfixBatch(
  outputPath: string,
  opts: TopicfixOptions = {},
): Promise<{ applied: number; skipped: number; collisions: number }> {
  const output = topicfixOutputSchema.parse((await readJson<unknown>(outputPath)) ?? {});
  const inputPath = outputPath.replace(/\.output\.json$/, '.input.json');
  if (inputPath === outputPath) {
    throw new Error(`Путь вывода должен заканчиваться на .output.json: ${outputPath}`);
  }
  const input = await readJson<{ batchId?: unknown; questions?: Array<{ id?: unknown }> }>(inputPath);
  if (!input) throw new Error(`Не найден входной файл батча: ${inputPath}`);
  if (typeof input.batchId !== 'string' || input.batchId !== output.batchId) {
    throw new Error(`batchId вывода (${output.batchId}) не совпадает с входом (${input.batchId})`);
  }

  const inputIds = new Set(
    (input.questions ?? [])
      .map((question) => question.id)
      .filter((id): id is string => typeof id === 'string'),
  );

  const assignmentCounts = new Map<string, number>();
  for (const assignment of output.assignments) {
    if (!inputIds.has(assignment.id)) {
      throw new Error(`Назначение по id не из батча: ${assignment.id}`);
    }
    if (!isKnownTopic(assignment.topic)) {
      throw new Error(`Неизвестная тема: ${assignment.topic}`);
    }
    assignmentCounts.set(assignment.id, (assignmentCounts.get(assignment.id) ?? 0) + 1);
  }

  // Батч закрыт, только если каждый вопрос назначен ровно один раз.
  const duplicates = [...assignmentCounts]
    .filter(([, count]) => count > 1)
    .map(([id]) => id);
  if (duplicates.length > 0) {
    throw new Error(`Вопросы назначены несколько раз: ${duplicates.join(', ')}`);
  }
  const missing = [...inputIds].filter((id) => !assignmentCounts.has(id));
  if (missing.length > 0) {
    throw new Error(`Батч неполный, нет назначения темы для вопросов: ${missing.join(', ')}`);
  }

  const questionsPath = opts.questionsPath ?? path.join(paths.generated, 'questions.json');
  const store = await readStore(questionsPath);
  const indexById = new Map<string, number>();
  store.forEach((record, index) => {
    const id = (record as { id?: unknown }).id;
    if (typeof id === 'string') indexById.set(id, index);
  });

  let applied = 0;
  let skipped = 0;
  let collisions = 0;
  const appliedRecords: TopicOverride[] = [];

  for (const assignment of output.assignments) {
    const index = indexById.get(assignment.id);
    if (index === undefined) {
      skipped += 1;
      continue;
    }
    const parsed = parsedQuestionSchema.safeParse(store[index]);
    if (!parsed.success) {
      skipped += 1;
      continue;
    }

    const newId = makeId(assignment.topic, parsed.data.question);
    if (newId === assignment.id) {
      skipped += 1;
      continue;
    }
    if (indexById.has(newId)) {
      collisions += 1;
      continue;
    }

    store[index] = {
      ...(store[index] as Record<string, unknown>),
      id: newId,
      topic: assignment.topic,
    };
    indexById.delete(assignment.id);
    indexById.set(newId, index);
    applied += 1;
    appliedRecords.push({
      source: parsed.data.source,
      sourceUrl: parsed.data.sourceUrl,
      question: parsed.data.question,
      topic: assignment.topic,
    });
  }

  // Фиксируем применённые переносы, чтобы seed и повторный parse не вернули старую тему.
  // Реестр пишем до store: если запись store упадёт, реестр окажется «впереди»,
  // и связка parse + seed самовосстановит рабочую базу.
  const overridesPath = opts.overridesPath ?? paths.topicOverrides;
  const overrides = await loadTopicOverrides(overridesPath);
  const byKey = new Map(overrides.map((override) => [overrideKey(override), override]));
  for (const record of appliedRecords) {
    const key = contentKey(record);
    if (!key) continue;
    byKey.set(key, {
      source: record.source,
      sourceUrl: record.sourceUrl,
      question: record.question,
      topic: record.topic,
    });
  }

  await saveTopicOverrides([...byKey.values()], overridesPath);
  await writeJson(questionsPath, store);

  return { applied, skipped, collisions };
}
