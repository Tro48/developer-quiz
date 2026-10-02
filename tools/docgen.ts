import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { docMapSchema, loadDocMaps, type DocSection } from './docmap';
import { makeId, normalizeQuestionText } from './ids';
import { idsInBatches, readJson, uniqueBatchId, writeJson } from './io';
import { paths } from './paths';
import { isCoreTopic } from './taxonomy';
import { generatedQuestionSchema, gradeSchema } from './types';

export type DocgenOptions = {
  topic?: string;
  grade?: 'junior' | 'middle' | 'senior';
  size?: number;
  docMapDir?: string;
  questionsPath?: string;
  batchesDir?: string;
  now?: Date;
};

const docgenOutputSchema = z.object({
  batchId: z.string().min(1),
  results: z.array(
    z.object({
      sectionId: z.string().regex(/^[a-z0-9-]+$/),
      topic: z.string().min(1),
      grade: gradeSchema,
      question: z.string().min(1),
      answer: z.string().min(1),
      options: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1), z.string().min(1)]),
      correctIndex: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
      explanation: z.string().min(1),
      docsRefs: z.array(z.string().url()).min(1),
    }),
  ),
  skipped: z.array(z.object({ sectionId: z.string(), reason: z.string().min(1) })).default([]),
});

async function readStore(filePath: string): Promise<unknown[]> {
  return (await readJson<unknown[]>(filePath)) ?? [];
}

function contentKey(record: { source?: unknown; sourceUrl?: unknown; question?: unknown }): string | null {
  if (
    typeof record.source !== 'string' ||
    typeof record.sourceUrl !== 'string' ||
    typeof record.question !== 'string'
  ) {
    return null;
  }
  return `${record.source}|${record.sourceUrl}|${normalizeQuestionText(record.question)}`;
}

async function sectionsInBatches(batchesDir: string): Promise<Set<string>> {
  const dir = path.join(batchesDir, 'docgen');
  let files: string[] = [];
  try {
    files = await readdir(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Set();
    throw error;
  }

  const sections = new Set<string>();
  for (const file of files) {
    if (!file.endsWith('.input.json') && !file.endsWith('.output.json')) continue;
    const content = await readJson<{
      sections?: Array<{ id?: unknown }>;
      results?: Array<{ sectionId?: unknown }>;
      skipped?: Array<{ sectionId?: unknown }>;
    }>(path.join(dir, file));
    if (!content) continue;
    for (const section of content.sections ?? []) {
      if (typeof section.id === 'string') sections.add(section.id);
    }
    for (const sectionId of [
      ...(content.results ?? []).map((result) => result.sectionId),
      ...(content.skipped ?? []).map((skip) => skip.sectionId),
    ]) {
      if (typeof sectionId === 'string') sections.add(sectionId);
    }
  }
  return sections;
}

export async function emitDocgenBatch(
  opts: DocgenOptions = {},
): Promise<{ batchId: string; inputPath: string } | null> {
  const batchesDir = opts.batchesDir ?? paths.batches;
  const size = opts.size ?? 10;
  const sections: DocSection[] = await loadDocMaps(opts.docMapDir);
  const used = await sectionsInBatches(batchesDir);
  const selected = sections
    .filter((section) => (opts.topic ? section.topic === opts.topic : true))
    .filter((section) => (opts.grade ? section.grade === opts.grade : true))
    .filter((section) => !used.has(section.id))
    .slice(0, size);

  if (selected.length === 0) return null;

  const batchId = await uniqueBatchId('docgen', opts.now ?? new Date(), batchesDir);
  const inputPath = path.join(batchesDir, 'docgen', `${batchId}.input.json`);
  await writeJson(inputPath, {
    batchId,
    kind: 'docgen',
    prompt: 'tools/prompts/docgen.md',
    sections: selected,
  });
  return { batchId, inputPath };
}

async function readDocgenInput(
  outputPath: string,
): Promise<{ batchId: string; sections: DocSection[] }> {
  const inputPath = outputPath.replace(/\.output\.json$/, '.input.json');
  if (inputPath === outputPath) {
    throw new Error(`Путь вывода должен заканчиваться на .output.json: ${outputPath}`);
  }
  const input = await readJson<{ batchId?: unknown; sections?: unknown }>(inputPath);
  if (!input) throw new Error(`Не найден входной файл батча: ${inputPath}`);
  if (typeof input.batchId !== 'string' || !input.batchId) {
    throw new Error(`Во входном файле нет batchId: ${inputPath}`);
  }
  return { batchId: input.batchId, sections: docMapSchema.parse(input.sections ?? []) };
}

export async function mergeDocgenBatch(
  outputPath: string,
  opts: DocgenOptions = {},
): Promise<{ added: number; skipped: number }> {
  const output = docgenOutputSchema.parse((await readJson<unknown>(outputPath)) ?? {});
  const input = await readDocgenInput(outputPath);
  if (output.batchId !== input.batchId) {
    throw new Error(`batchId вывода (${output.batchId}) не совпадает с входом (${input.batchId})`);
  }

  const sectionsById = new Map(input.sections.map((section) => [section.id, section]));
  const questionsPath = opts.questionsPath ?? path.join(paths.generated, 'questions.json');
  const store = await readStore(questionsPath);

  const indexById = new Map<string, number>();
  const contentKeys = new Set<string>();
  store.forEach((record, index) => {
    const item = record as { id?: unknown; source?: unknown; sourceUrl?: unknown; question?: unknown };
    if (typeof item.id === 'string') indexById.set(item.id, index);
    const key = contentKey(item);
    if (key) contentKeys.add(key);
  });

  let added = 0;
  let skipped = 0;

  for (const result of output.results) {
    const section = sectionsById.get(result.sectionId);
    if (!section) throw new Error(`Раздел не из батча: ${result.sectionId}`);
    if (result.topic !== section.topic) {
      throw new Error(
        `Тема результата (${result.topic}) не совпадает с картой (${section.topic}): ${result.sectionId}`,
      );
    }
    if (!isCoreTopic(result.topic)) throw new Error(`Тема не в ядре: ${result.topic}`);

    const id = makeId(result.topic, result.question);
    const key = `docgen|${section.url}|${normalizeQuestionText(result.question)}`;
    if (indexById.has(id) || contentKeys.has(key)) {
      skipped += 1;
      continue;
    }

    const record = generatedQuestionSchema.parse({
      id,
      topic: result.topic,
      topicHint: section.title,
      grade: result.grade,
      source: 'docgen',
      sourceUrl: section.url,
      question: result.question,
      answer: result.answer,
      options: result.options,
      correctIndex: result.correctIndex,
      explanation: result.explanation,
      docsRefs: result.docsRefs,
      status: 'generated',
      docSection: section.id,
    });

    store.push(record);
    indexById.set(id, store.length - 1);
    contentKeys.add(key);
    added += 1;
  }

  for (const skip of output.skipped) {
    if (!sectionsById.has(skip.sectionId)) {
      throw new Error(`skipped содержит раздел не из батча: ${skip.sectionId}`);
    }
    skipped += 1;
  }

  await writeJson(questionsPath, store);
  return { added, skipped };
}

export type DocgenStatusRow = { topic: string; total: number; covered: number; verified: number };

export async function docgenStatus(
  opts: { docMapDir?: string; questionsPath?: string } = {},
): Promise<DocgenStatusRow[]> {
  const sections = await loadDocMaps(opts.docMapDir);
  const questionsPath = opts.questionsPath ?? path.join(paths.generated, 'questions.json');
  const store = await readStore(questionsPath);

  const statusBySection = new Map<string, string>();
  for (const record of store) {
    const item = record as { docSection?: unknown; status?: unknown };
    if (
      typeof item.docSection === 'string' &&
      typeof item.status === 'string' &&
      !statusBySection.has(item.docSection)
    ) {
      statusBySection.set(item.docSection, item.status);
    }
  }

  const rows = new Map<string, DocgenStatusRow>();
  for (const section of sections) {
    const row = rows.get(section.topic) ?? { topic: section.topic, total: 0, covered: 0, verified: 0 };
    row.total += 1;
    const status = statusBySection.get(section.id);
    if (status) row.covered += 1;
    if (status === 'verified') row.verified += 1;
    rows.set(section.topic, row);
  }

  return [...rows.values()].sort((a, b) => a.topic.localeCompare(b.topic));
}
