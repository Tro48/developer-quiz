import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  emitGenerationBatch,
  emitVerificationBatch,
  mergeGenerationBatch,
  mergeVerificationBatch,
} from '../tools/batch';
import { makeId } from '../tools/ids';
import type { ParsedQuestion } from '../tools/types';

function makeParsed(question: string): ParsedQuestion {
  return {
    id: makeId('javascript', question),
    topic: 'javascript',
    topicHint: 'javascript',
    source: 'yauhenkavalchuk',
    sourceUrl: 'https://youtu.be/example',
    question,
    answer: '',
    status: 'parsed',
  };
}

async function setup() {
  const root = await mkdtemp(path.join(tmpdir(), 'dq-batch-'));
  const parsedPath = path.join(root, 'parsed/all.json');
  const questionsPath = path.join(root, 'generated/questions.json');
  const batchesDir = path.join(root, 'batches');

  const questions = [makeParsed('Вопрос 1?'), makeParsed('Вопрос 2?'), makeParsed('Вопрос 3?')];
  await mkdir(path.dirname(parsedPath), { recursive: true });
  await writeFile(parsedPath, JSON.stringify(questions), 'utf8');

  return { root, parsedPath, questionsPath, batchesDir };
}

type Paths = { parsedPath: string; questionsPath: string; batchesDir: string };

function generationResult(id: string, index = 0) {
  return {
    id,
    grade: 'junior',
    answer: `Ответ ${index}.`,
    options: ['А', 'Б', 'В', 'Г'],
    correctIndex: 0,
    explanation: 'Пояснение.',
    docsRefs: ['https://developer.mozilla.org/ru/docs/Web/JavaScript'],
  };
}

async function readJsonFile(filePath: string) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeGenerationOutput(
  paths: Paths,
  batchId: string,
  body: { results: unknown[]; skipped?: unknown[] },
) {
  const outputPath = path.join(paths.batchesDir, 'generation', `${batchId}.output.json`);
  await writeFile(outputPath, JSON.stringify({ batchId, ...body }), 'utf8');
  return outputPath;
}

async function writeVerificationOutput(
  paths: Paths,
  batchId: string,
  verdicts: unknown[],
) {
  const outputPath = path.join(paths.batchesDir, 'verification', `${batchId}.output.json`);
  await writeFile(outputPath, JSON.stringify({ batchId, verdicts }), 'utf8');
  return outputPath;
}

async function generateAll(paths: Paths) {
  const batch = await emitGenerationBatch({ ...paths, size: 3 });
  const input = await readJsonFile(batch!.inputPath);
  const outputPath = await writeGenerationOutput(paths, batch!.batchId, {
    results: input.questions.map((q: { id: string }, index: number) => generationResult(q.id, index)),
  });
  await mergeGenerationBatch(outputPath, paths);
  return { batch, input, outputPath };
}

describe('батчи генерации', () => {
  it('выдаёт вопросы порциями и не повторяет уже выданные', async () => {
    const { parsedPath, questionsPath, batchesDir } = await setup();
    const first = await emitGenerationBatch({
      parsedPath,
      questionsPath,
      batchesDir,
      size: 2,
      now: new Date('2026-10-02T15:30:00Z'),
    });
    expect(first?.batchId).toBe('generation-20261002-153000');

    const firstInput = await readJsonFile(first!.inputPath);
    expect(firstInput.questions).toHaveLength(2);
    expect(firstInput.prompt).toBe('tools/prompts/generate.md');

    const second = await emitGenerationBatch({
      parsedPath,
      questionsPath,
      batchesDir,
      size: 2,
      now: new Date('2026-10-02T15:31:00Z'),
    });
    const secondInput = await readJsonFile(second!.inputPath);
    expect(secondInput.questions).toHaveLength(1);
  });

  it('в одну секунду подбирает уникальный id батча', async () => {
    const { parsedPath, questionsPath, batchesDir } = await setup();
    const now = new Date('2026-10-02T15:30:00Z');

    const first = await emitGenerationBatch({ parsedPath, questionsPath, batchesDir, size: 2, now });
    const second = await emitGenerationBatch({ parsedPath, questionsPath, batchesDir, size: 2, now });

    expect(first?.batchId).toBe('generation-20261002-153000');
    expect(second?.batchId).toBe('generation-20261002-153000-2');
  });

  it('мержит ответы агента и отклоняет пропущенные с причиной', async () => {
    const paths = await setup();
    const batch = await emitGenerationBatch({ ...paths, size: 2 });
    const input = await readJsonFile(batch!.inputPath);

    const outputPath = await writeGenerationOutput(paths, batch!.batchId, {
      results: [generationResult(input.questions[0].id)],
      skipped: [{ id: input.questions[1].id, reason: 'не подтверждается документацией' }],
    });

    const result = await mergeGenerationBatch(outputPath, paths);
    expect(result).toEqual({ updated: 1, rejected: 1 });

    const store = await readJsonFile(paths.questionsPath);
    const generated = store.find((q: { id: string }) => q.id === input.questions[0].id);
    const rejected = store.find((q: { id: string }) => q.id === input.questions[1].id);

    expect(generated.status).toBe('generated');
    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectReason).toBe('генерация: не подтверждается документацией');
  });

  it('отклоняет вопрос, который агент молча пропустил', async () => {
    const paths = await setup();
    const batch = await emitGenerationBatch({ ...paths, size: 2 });
    const input = await readJsonFile(batch!.inputPath);

    const outputPath = await writeGenerationOutput(paths, batch!.batchId, {
      results: [generationResult(input.questions[0].id)],
    });

    const result = await mergeGenerationBatch(outputPath, paths);
    expect(result).toEqual({ updated: 1, rejected: 1 });

    const store = await readJsonFile(paths.questionsPath);
    const rejected = store.find((q: { id: string }) => q.id === input.questions[1].id);
    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectReason).toBe('генерация: агент не вернул результат');
  });

  it('падает на чужом batchId', async () => {
    const paths = await setup();
    const batch = await emitGenerationBatch({ ...paths, size: 1 });
    const input = await readJsonFile(batch!.inputPath);

    const outputPath = await writeGenerationOutput(paths, 'generation-19700101-000000', {
      results: [generationResult(input.questions[0].id)],
    });

    await expect(mergeGenerationBatch(outputPath, paths)).rejects.toThrow(/batchId/);
  });

  it('падает на id не из батча', async () => {
    const paths = await setup();
    const batch = await emitGenerationBatch({ ...paths, size: 1 });

    const outputPath = await writeGenerationOutput(paths, batch!.batchId, {
      results: [generationResult('javascript-00000000')],
    });

    await expect(mergeGenerationBatch(outputPath, paths)).rejects.toThrow(/не из батча/);
  });
});

describe('батчи верификации', () => {
  it('выдаёт сгенерированные вопросы и принимает вердикты', async () => {
    const paths = await setup();
    await generateAll(paths);

    const verification = await emitVerificationBatch({
      questionsPath: paths.questionsPath,
      batchesDir: paths.batchesDir,
      size: 2,
      now: new Date('2026-10-02T16:00:00Z'),
    });
    expect(verification?.batchId).toBe('verification-20261002-160000');

    const verificationInput = await readJsonFile(verification!.inputPath);
    expect(verificationInput.questions).toHaveLength(2);
    expect(verificationInput.prompt).toBe('tools/prompts/verify.md');

    const outputPath = await writeVerificationOutput(paths, verification!.batchId, [
      { id: verificationInput.questions[0].id, verdict: 'verified' },
      { id: verificationInput.questions[1].id, verdict: 'rejected', reason: 'спорные дистракторы' },
    ]);

    const result = await mergeVerificationBatch(outputPath, { questionsPath: paths.questionsPath });
    expect(result).toEqual({ verified: 1, rejected: 1 });

    const store = await readJsonFile(paths.questionsPath);
    const verified = store.find((q: { id: string }) => q.id === verificationInput.questions[0].id);
    const rejected = store.find((q: { id: string }) => q.id === verificationInput.questions[1].id);
    expect(verified.status).toBe('verified');
    expect(verified.rejectReason).toBeUndefined();
    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectReason).toBe('верификация: спорные дистракторы');
  });

  it('отклоняет вопрос без вердикта агента', async () => {
    const paths = await setup();
    await generateAll(paths);

    const verification = await emitVerificationBatch({
      questionsPath: paths.questionsPath,
      batchesDir: paths.batchesDir,
      size: 2,
    });
    const verificationInput = await readJsonFile(verification!.inputPath);

    const outputPath = await writeVerificationOutput(paths, verification!.batchId, [
      { id: verificationInput.questions[0].id, verdict: 'verified' },
    ]);

    const result = await mergeVerificationBatch(outputPath, { questionsPath: paths.questionsPath });
    expect(result).toEqual({ verified: 1, rejected: 1 });

    const store = await readJsonFile(paths.questionsPath);
    const rejected = store.find((q: { id: string }) => q.id === verificationInput.questions[1].id);
    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectReason).toBe('верификация: агент не вернул вердикт');
  });

  it('стирает старый rejectReason при подтверждении', async () => {
    const paths = await setup();
    await generateAll(paths);

    const store = await readJsonFile(paths.questionsPath);
    store[0] = { ...store[0], rejectReason: 'старое' };
    await writeFile(paths.questionsPath, JSON.stringify(store));

    const verification = await emitVerificationBatch({
      questionsPath: paths.questionsPath,
      batchesDir: paths.batchesDir,
      size: 1,
    });
    const verificationInput = await readJsonFile(verification!.inputPath);

    const outputPath = await writeVerificationOutput(paths, verification!.batchId, [
      { id: verificationInput.questions[0].id, verdict: 'verified' },
    ]);
    const result = await mergeVerificationBatch(outputPath, { questionsPath: paths.questionsPath });
    expect(result).toEqual({ verified: 1, rejected: 0 });

    const updated = await readJsonFile(paths.questionsPath);
    expect(updated[0].rejectReason).toBeUndefined();
  });

  it('требует причину для rejected', async () => {
    const paths = await setup();
    const outputPath = path.join(
      paths.batchesDir,
      'verification',
      'verification-20261002-170000.output.json',
    );
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(
      outputPath,
      JSON.stringify({
        batchId: 'verification-20261002-170000',
        verdicts: [{ id: 'javascript-00000000', verdict: 'rejected' }],
      }),
    );
    await expect(
      mergeVerificationBatch(outputPath, { questionsPath: paths.questionsPath }),
    ).rejects.toThrow(/причина/i);
  });
});
