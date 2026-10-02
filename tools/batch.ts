import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { paths } from './paths';
import { CORE_TOPIC_SLUGS } from './taxonomy';
import {
  GRADES,
  generatedQuestionSchema,
  parsedQuestionSchema,
  type GeneratedQuestion,
  type ParsedQuestion,
} from './types';

export type BatchOptions = {
  parsedPath?: string;
  questionsPath?: string;
  batchesDir?: string;
  now?: Date;
  size?: number;
  allowedTopics?: readonly string[];
};

type BatchKind = 'generation' | 'verification';

// Метка батча в UTC без спецсимволов: 20261002-153000.
export function batchStamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
  );
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

// В пределах одной секунды метка может совпасть: добавляем числовой суффикс.
async function uniqueBatchId(kind: BatchKind, date: Date, batchesDir: string): Promise<string> {
  const base = `${kind}-${batchStamp(date)}`;
  const dir = path.join(batchesDir, kind);

  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const inputExists = await fileExists(path.join(dir, `${candidate}.input.json`));
    const outputExists = await fileExists(path.join(dir, `${candidate}.output.json`));
    if (!inputExists && !outputExists) return candidate;
  }

  throw new Error(`Не удалось подобрать уникальный id батча: ${base}`);
}

async function readJson<T>(filePath: string): Promise<T | null> {
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
  return JSON.parse(raw) as T;
}

// Атомарная запись: временный файл + переименование.
async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, JSON.stringify(value, null, 2), 'utf8');
  await rename(tempPath, filePath);
}

type BatchFile = {
  batchId?: unknown;
  questions?: Array<{ id?: unknown }>;
  results?: Array<{ id?: unknown }>;
  verdicts?: Array<{ id?: unknown }>;
};

// Собирает id вопросов, уже встречавшихся в файлах батчей, чтобы не выдать их повторно.
async function idsInBatches(kind: BatchKind, batchesDir: string): Promise<Set<string>> {
  const dir = path.join(batchesDir, kind);
  let files: string[] = [];
  try {
    files = await readdir(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Set();
    throw error;
  }

  const ids = new Set<string>();
  for (const file of files) {
    if (!file.endsWith('.input.json') && !file.endsWith('.output.json')) continue;
    const content = await readJson<BatchFile>(path.join(dir, file));
    if (!content) continue;
    for (const list of [content.questions, content.results, content.verdicts]) {
      for (const item of list ?? []) {
        if (typeof item?.id === 'string') ids.add(item.id);
      }
    }
  }
  return ids;
}

async function loadStore(opts: BatchOptions): Promise<{ questions: unknown[]; path: string }> {
  const questionsPath = opts.questionsPath ?? path.join(paths.generated, 'questions.json');
  const generated = await readJson<unknown[]>(questionsPath);
  if (generated) return { questions: generated, path: questionsPath };

  const parsedPath = opts.parsedPath ?? path.join(paths.parsed, 'all.json');
  return { questions: (await readJson<unknown[]>(parsedPath)) ?? [], path: questionsPath };
}

function parseParsedQuestions(questions: unknown[]): ParsedQuestion[] {
  const parsed: ParsedQuestion[] = [];
  for (const question of questions) {
    const result = parsedQuestionSchema.safeParse(question);
    if (result.success) parsed.push(result.data);
  }
  return parsed;
}

function parseGeneratedQuestions(questions: unknown[]): GeneratedQuestion[] {
  const generated: GeneratedQuestion[] = [];
  for (const question of questions) {
    const result = generatedQuestionSchema.safeParse(question);
    if (result.success && result.data.status === 'generated') generated.push(result.data);
  }
  return generated;
}

function inputIdsOf(questions: unknown[]): string[] {
  return questions
    .map((question) => (question as { id?: unknown }).id)
    .filter((id): id is string => typeof id === 'string');
}

// Читает входной файл, соответствующий output-файлу, и проверяет его batchId.
async function readInputBatch(outputPath: string): Promise<{ batchId: string; questions: unknown[] }> {
  const inputPath = outputPath.replace(/\.output\.json$/, '.input.json');
  if (inputPath === outputPath) {
    throw new Error(`Путь вывода должен заканчиваться на .output.json: ${outputPath}`);
  }
  const input = await readJson<BatchFile & { questions?: unknown[] }>(inputPath);
  if (!input) {
    const batchId = path.basename(outputPath).replace(/\.output\.json$/, '');
    throw new Error(`Не найден входной файл батча (batchId: ${batchId}): ${inputPath}`);
  }
  if (typeof input.batchId !== 'string' || !input.batchId) {
    throw new Error(`Во входном файле нет batchId: ${inputPath}`);
  }
  return { batchId: input.batchId, questions: input.questions ?? [] };
}

const generationOutputSchema = z.object({
  batchId: z.string().min(1),
  results: z.array(
    z.object({
      id: z.string().regex(/^[a-z0-9-]+-[0-9a-f]{8}$/),
      grade: z.enum(GRADES),
      answer: z.string().min(1),
      options: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1), z.string().min(1)]),
      correctIndex: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
      explanation: z.string().min(1),
      docsRefs: z.array(z.string().url()).min(1),
    }),
  ),
  skipped: z
    .array(z.object({ id: z.string(), reason: z.string().min(1) }))
    .optional()
    .default([]),
});

const verificationOutputSchema = z
  .object({
    batchId: z.string().min(1),
    verdicts: z.array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]+-[0-9a-f]{8}$/),
        verdict: z.enum(['verified', 'rejected']),
        reason: z.string().min(1).optional(),
      }),
    ),
  })
  .superRefine((value, ctx) => {
    value.verdicts.forEach((verdict, index) => {
      if (verdict.verdict === 'rejected' && !verdict.reason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['verdicts', index, 'reason'],
          message: 'Для rejected обязательна причина',
        });
      }
    });
  });

export async function emitGenerationBatch(
  opts: BatchOptions = {},
): Promise<{ batchId: string; inputPath: string } | null> {
  const batchesDir = opts.batchesDir ?? paths.batches;
  const size = opts.size ?? 10;
  const allowedTopics = opts.allowedTopics ?? CORE_TOPIC_SLUGS;
  const { questions } = await loadStore(opts);
  const used = await idsInBatches('generation', batchesDir);
  const selected = parseParsedQuestions(questions)
    .filter((question) => !used.has(question.id))
    .filter((question) => allowedTopics.includes(question.topic))
    .slice(0, size);

  if (selected.length === 0) return null;

  const id = await uniqueBatchId('generation', opts.now ?? new Date(), batchesDir);
  const inputPath = path.join(batchesDir, 'generation', `${id}.input.json`);
  await writeJson(inputPath, {
    batchId: id,
    kind: 'generation',
    prompt: 'tools/prompts/generate.md',
    questions: selected,
  });
  return { batchId: id, inputPath };
}

export async function mergeGenerationBatch(
  outputPath: string,
  opts: BatchOptions = {},
): Promise<{ updated: number; rejected: number }> {
  const output = generationOutputSchema.parse((await readJson<unknown>(outputPath)) ?? {});
  const input = await readInputBatch(outputPath);
  if (output.batchId !== input.batchId) {
    throw new Error(`batchId вывода (${output.batchId}) не совпадает с входом (${input.batchId})`);
  }

  const inputIds = inputIdsOf(input.questions);
  const resultById = new Map<string, (typeof output.results)[number]>();
  for (const result of output.results) {
    if (!inputIds.includes(result.id)) {
      throw new Error(`Ответ агента содержит id не из батча: ${result.id}`);
    }
    if (resultById.has(result.id)) {
      throw new Error(`Дубликат id в results: ${result.id}`);
    }
    resultById.set(result.id, result);
  }

  const skippedById = new Map<string, string>();
  for (const skip of output.skipped) {
    if (!inputIds.includes(skip.id)) {
      throw new Error(`skipped содержит id не из батча: ${skip.id}`);
    }
    if (resultById.has(skip.id) || skippedById.has(skip.id)) {
      throw new Error(`id встречается несколько раз: ${skip.id}`);
    }
    skippedById.set(skip.id, skip.reason);
  }

  const { questions, path: storePath } = await loadStore(opts);
  const merged = [...questions];
  const parsedById = new Map(parseParsedQuestions(questions).map((q) => [q.id, q]));
  const indexById = new Map<string, number>();
  merged.forEach((question, index) => {
    const id = (question as { id?: string }).id;
    if (id) indexById.set(id, index);
  });

  let updated = 0;
  let rejected = 0;
  for (const id of inputIds) {
    const source = parsedById.get(id);
    const index = indexById.get(id);
    if (!source || index === undefined) continue;

    const result = resultById.get(id);
    if (result) {
      merged[index] = generatedQuestionSchema.parse({ ...source, ...result, status: 'generated' });
      updated += 1;
      continue;
    }

    const reason = skippedById.get(id) ?? 'агент не вернул результат';
    merged[index] = { ...source, status: 'rejected', rejectReason: `генерация: ${reason}` };
    rejected += 1;
  }

  await writeJson(storePath, merged);
  return { updated, rejected };
}

export async function emitVerificationBatch(
  opts: BatchOptions = {},
): Promise<{ batchId: string; inputPath: string } | null> {
  const batchesDir = opts.batchesDir ?? paths.batches;
  const size = opts.size ?? 10;
  const allowedTopics = opts.allowedTopics ?? CORE_TOPIC_SLUGS;
  const { questions } = await loadStore(opts);
  const used = await idsInBatches('verification', batchesDir);
  const selected = parseGeneratedQuestions(questions)
    .filter((question) => allowedTopics.includes(question.topic))
    .filter((question) => !used.has(question.id))
    .slice(0, size);

  if (selected.length === 0) return null;

  const id = await uniqueBatchId('verification', opts.now ?? new Date(), batchesDir);
  const inputPath = path.join(batchesDir, 'verification', `${id}.input.json`);
  await writeJson(inputPath, {
    batchId: id,
    kind: 'verification',
    prompt: 'tools/prompts/verify.md',
    questions: selected,
  });
  return { batchId: id, inputPath };
}

export async function mergeVerificationBatch(
  outputPath: string,
  opts: BatchOptions = {},
): Promise<{ verified: number; rejected: number }> {
  const output = verificationOutputSchema.parse((await readJson<unknown>(outputPath)) ?? {});
  const input = await readInputBatch(outputPath);
  if (output.batchId !== input.batchId) {
    throw new Error(`batchId вывода (${output.batchId}) не совпадает с входом (${input.batchId})`);
  }

  const inputIds = inputIdsOf(input.questions);
  const verdictById = new Map<string, (typeof output.verdicts)[number]>();
  for (const verdict of output.verdicts) {
    if (!inputIds.includes(verdict.id)) {
      throw new Error(`Вердикт по id не из батча: ${verdict.id}`);
    }
    if (verdictById.has(verdict.id)) {
      throw new Error(`Дубликат вердикта: ${verdict.id}`);
    }
    verdictById.set(verdict.id, verdict);
  }

  const questionsPath = opts.questionsPath ?? path.join(paths.generated, 'questions.json');
  const store = (await readJson<unknown[]>(questionsPath)) ?? [];
  const indexById = new Map<string, number>();
  store.forEach((question, index) => {
    const id = (question as { id?: string }).id;
    if (id) indexById.set(id, index);
  });

  let verified = 0;
  let rejected = 0;
  for (const id of inputIds) {
    const index = indexById.get(id);
    if (index === undefined) continue;
    const current = generatedQuestionSchema.parse(store[index]);
    const verdict = verdictById.get(id);

    if (verdict?.verdict === 'verified') {
      store[index] = { ...current, status: 'verified', rejectReason: undefined };
      verified += 1;
      continue;
    }

    const reason = verdict?.reason ?? 'агент не вернул вердикт';
    store[index] = { ...current, status: 'rejected', rejectReason: `верификация: ${reason}` };
    rejected += 1;
  }

  await writeJson(questionsPath, store);
  return { verified, rejected };
}
