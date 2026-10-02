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

    const firstInput = JSON.parse(await readFile(first!.inputPath, 'utf8'));
    expect(firstInput.questions).toHaveLength(2);
    expect(firstInput.prompt).toBe('tools/prompts/generate.md');

    const second = await emitGenerationBatch({
      parsedPath,
      questionsPath,
      batchesDir,
      size: 2,
      now: new Date('2026-10-02T15:31:00Z'),
    });
    const secondInput = JSON.parse(await readFile(second!.inputPath, 'utf8'));
    expect(secondInput.questions).toHaveLength(1);
  });

  it('мержит ответы агента и отклоняет пропущенные', async () => {
    const { parsedPath, questionsPath, batchesDir } = await setup();
    const batch = await emitGenerationBatch({ parsedPath, questionsPath, batchesDir, size: 2 });
    const input = JSON.parse(await readFile(batch!.inputPath, 'utf8'));

    const outputPath = path.join(batchesDir, 'generation', `${batch!.batchId}.output.json`);
    await writeFile(
      outputPath,
      JSON.stringify({
        batchId: batch!.batchId,
        results: [
          {
            id: input.questions[0].id,
            grade: 'junior',
            answer: 'Ответ.',
            options: ['А', 'Б', 'В', 'Г'],
            correctIndex: 2,
            explanation: 'Пояснение.',
            docsRefs: ['https://developer.mozilla.org/ru/docs/Web/JavaScript'],
          },
        ],
        skipped: [{ id: input.questions[1].id, reason: 'не подтверждается документацией' }],
      }),
    );

    const result = await mergeGenerationBatch(outputPath, { parsedPath, questionsPath, batchesDir });
    expect(result).toEqual({ updated: 1, rejected: 1 });

    const store = JSON.parse(await readFile(questionsPath, 'utf8'));
    expect(store.find((q: { id: string }) => q.id === input.questions[0].id).status).toBe('generated');
    expect(store.find((q: { id: string }) => q.id === input.questions[1].id).status).toBe('rejected');
  });
});

describe('батчи верификации', () => {
  it('выдаёт сгенерированные вопросы и принимает вердикты', async () => {
    const { parsedPath, questionsPath, batchesDir } = await setup();

    const generation = await emitGenerationBatch({ parsedPath, questionsPath, batchesDir, size: 3 });
    const generationInput = JSON.parse(await readFile(generation!.inputPath, 'utf8'));
    await writeFile(
      path.join(batchesDir, 'generation', `${generation!.batchId}.output.json`),
      JSON.stringify({
        batchId: generation!.batchId,
        results: generationInput.questions.map(
          (q: { id: string }, index: number) => ({
            id: q.id,
            grade: 'junior',
            answer: `Ответ ${index}.`,
            options: ['А', 'Б', 'В', 'Г'],
            correctIndex: 0,
            explanation: 'Пояснение.',
            docsRefs: ['https://developer.mozilla.org/ru/docs/Web/JavaScript'],
          }),
        ),
      }),
    );
    await mergeGenerationBatch(
      path.join(batchesDir, 'generation', `${generation!.batchId}.output.json`),
      { parsedPath, questionsPath, batchesDir },
    );

    const verification = await emitVerificationBatch({
      questionsPath,
      batchesDir,
      size: 2,
      now: new Date('2026-10-02T16:00:00Z'),
    });
    expect(verification?.batchId).toBe('verification-20261002-160000');
    const verificationInput = JSON.parse(await readFile(verification!.inputPath, 'utf8'));
    expect(verificationInput.questions).toHaveLength(2);
    expect(verificationInput.prompt).toBe('tools/prompts/verify.md');

    const outputPath = path.join(batchesDir, 'verification', `${verification!.batchId}.output.json`);
    await writeFile(
      outputPath,
      JSON.stringify({
        batchId: verification!.batchId,
        verdicts: [
          { id: verificationInput.questions[0].id, verdict: 'verified' },
          { id: verificationInput.questions[1].id, verdict: 'rejected', reason: 'спорные дистракторы' },
        ],
      }),
    );
    const result = await mergeVerificationBatch(outputPath, { questionsPath, batchesDir });
    expect(result).toEqual({ verified: 1, rejected: 1 });
  });

  it('требует причину для rejected', async () => {
    const { questionsPath, batchesDir } = await setup();
    const outputPath = path.join(batchesDir, 'verification', 'verification-20261002-170000.output.json');
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(
      outputPath,
      JSON.stringify({
        batchId: 'verification-20261002-170000',
        verdicts: [{ id: 'javascript-00000000', verdict: 'rejected' }],
      }),
    );
    await expect(mergeVerificationBatch(outputPath, { questionsPath, batchesDir })).rejects.toThrow(
      /причина/i,
    );
  });
});
