import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { paths } from './paths';
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

function makeBatchId(kind: BatchKind, date: Date): string {
  return `${kind}-${batchStamp(date)}`;
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

type BatchFile = {
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
  } catch {
    return new Set();
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
  const { questions } = await loadStore(opts);
  const used = await idsInBatches('generation', batchesDir);
  const selected = parseParsedQuestions(questions)
    .filter((question) => !used.has(question.id))
    .slice(0, size);

  if (selected.length === 0) return null;

  const id = makeBatchId('generation', opts.now ?? new Date());
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
  const { questions, path: storePath } = await loadStore(opts);
  const merged = [...questions];

  const parsedById = new Map(parseParsedQuestions(questions).map((q) => [q.id, q]));
  const indexById = new Map<string, number>();
  merged.forEach((question, index) => {
    const id = (question as { id?: string }).id;
    if (id) indexById.set(id, index);
  });

  let updated = 0;
  for (const result of output.results) {
    const source = parsedById.get(result.id);
    if (!source) continue;
    const candidate = generatedQuestionSchema.parse({ ...source, ...result, status: 'generated' });
    const index = indexById.get(candidate.id);
    if (index === undefined) {
      indexById.set(candidate.id, merged.length);
      merged.push(candidate);
    } else {
      merged[index] = candidate;
    }
    updated += 1;
  }

  let rejected = 0;
  for (const skip of output.skipped) {
    const source = parsedById.get(skip.id);
    const index = indexById.get(skip.id);
    if (!source || index === undefined) continue;
    merged[index] = { ...source, status: 'rejected', rejectReason: `генерация: ${skip.reason}` };
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
  const { questions } = await loadStore(opts);
  const used = await idsInBatches('verification', batchesDir);
  const selected = parseGeneratedQuestions(questions)
    .filter((question) => !used.has(question.id))
    .slice(0, size);

  if (selected.length === 0) return null;

  const id = makeBatchId('verification', opts.now ?? new Date());
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
  const questionsPath = opts.questionsPath ?? path.join(paths.generated, 'questions.json');
  const store = (await readJson<unknown[]>(questionsPath)) ?? [];

  const indexById = new Map<string, number>();
  store.forEach((question, index) => {
    const id = (question as { id?: string }).id;
    if (id) indexById.set(id, index);
  });

  let verified = 0;
  let rejected = 0;
  for (const verdict of output.verdicts) {
    const index = indexById.get(verdict.id);
    if (index === undefined) continue;
    const current = generatedQuestionSchema.parse(store[index]);
    if (verdict.verdict === 'verified') {
      store[index] = { ...current, status: 'verified' };
      verified += 1;
    } else {
      store[index] = { ...current, status: 'rejected', rejectReason: verdict.reason };
      rejected += 1;
    }
  }

  await writeJson(questionsPath, store);
  return { verified, rejected };
}
