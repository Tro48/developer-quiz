import path from 'node:path';
import { z } from 'zod';
import { makeId } from './ids';
import { idsInBatches, readJson, uniqueBatchId, writeJson } from './io';
import { paths } from './paths';
import { isKnownTopic } from './taxonomy';
import { parsedQuestionSchema } from './types';

export type TopicfixOptions = {
  hint?: string;
  size?: number;
  questionsPath?: string;
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
  const selected = store
    .filter((record) => {
      const item = record as { id?: unknown; status?: unknown; topicHint?: unknown };
      return (
        item.status === 'parsed' &&
        item.topicHint === hint &&
        typeof item.id === 'string' &&
        !used.has(item.id)
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

  for (const assignment of output.assignments) {
    if (!inputIds.has(assignment.id)) {
      throw new Error(`Назначение по id не из батча: ${assignment.id}`);
    }
    if (!isKnownTopic(assignment.topic)) {
      throw new Error(`Неизвестная тема: ${assignment.topic}`);
    }
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
    if (newId !== assignment.id && indexById.has(newId)) {
      collisions += 1;
      continue;
    }

    store[index] = { ...parsed.data, id: newId, topic: assignment.topic };
    indexById.delete(assignment.id);
    indexById.set(newId, index);
    applied += 1;
  }

  await writeJson(questionsPath, store);
  return { applied, skipped, collisions };
}
