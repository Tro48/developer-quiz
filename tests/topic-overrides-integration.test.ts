import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseAll } from '../tools/parse/index';
import { seedQuestions } from '../tools/seed';
import { emitTopicfixBatch, mergeTopicfixBatch } from '../tools/topicfix';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const MIXED_HINT = 'Общие вопросы (Soft Skills, опыт и мотивация)';
const HEXLET_URL =
  'https://raw.githubusercontent.com/Hexlet/ru-interview-questions/main/questions/frontend.md';
const QUESTION = 'Решал ли какие-то задачки-каты? Codebattle, Codewars, Leetcode?';

type Workspace = {
  rawDir: string;
  parsedPath: string;
  questionsPath: string;
  overridesPath: string;
  batchesDir: string;
};

type StoredQuestion = { id?: unknown; topic?: unknown; question?: unknown };

async function setup(): Promise<Workspace> {
  const root = await mkdtemp(path.join(tmpdir(), 'dq-overrides-integration-'));
  const rawDir = path.join(root, 'raw');

  await mkdir(path.join(rawDir, 'hexlet'), { recursive: true });
  await cp(path.join(fixturesDir, 'hexlet-frontend.md'), path.join(rawDir, 'hexlet/frontend.md'));

  return {
    rawDir,
    parsedPath: path.join(root, 'parsed', 'all.json'),
    questionsPath: path.join(root, 'generated', 'questions.json'),
    overridesPath: path.join(root, 'overrides.json'),
    batchesDir: path.join(root, 'batches'),
  };
}

async function findStored(filePath: string, question: string): Promise<StoredQuestion | undefined> {
  const store = JSON.parse(await readFile(filePath, 'utf8')) as StoredQuestion[];
  return store.find((record) => record.question === question);
}

describe('инвариант исключений тем', () => {
  it('parse + topicfix merge + seed не откатывают тему при повторном parse', async () => {
    const ws = await setup();

    // 1. Первичный parse без исключений и seed в рабочую базу.
    await parseAll({ rawDir: ws.rawDir, parsedPath: ws.parsedPath, overridesPath: ws.overridesPath });
    const firstSeed = await seedQuestions({
      parsedPath: ws.parsedPath,
      questionsPath: ws.questionsPath,
    });
    const before = await findStored(ws.questionsPath, QUESTION);
    expect(before?.topic).toBe('soft-skills');

    // 2. Topicfix-батч по смешанной подсказке: переносим вопрос в javascript.
    const batch = await emitTopicfixBatch({
      hint: MIXED_HINT,
      questionsPath: ws.questionsPath,
      batchesDir: ws.batchesDir,
      now: new Date('2026-10-02T18:00:00Z'),
    });
    expect(batch).not.toBeNull();

    const outputPath = path.join(ws.batchesDir, 'topicfix', `${batch!.batchId}.output.json`);
    const inputPath = path.join(ws.batchesDir, 'topicfix', `${batch!.batchId}.input.json`);
    const input = JSON.parse(await readFile(inputPath, 'utf8')) as {
      questions: Array<{ id: string; topic: string }>;
    };
    await writeFile(
      outputPath,
      JSON.stringify({
        batchId: batch!.batchId,
        assignments: input.questions.map((question) => ({
          id: question.id,
          topic: question.id === String(before!.id) ? 'javascript' : question.topic,
        })),
      }),
      'utf8',
    );

    expect(
      await mergeTopicfixBatch(outputPath, {
        questionsPath: ws.questionsPath,
        overridesPath: ws.overridesPath,
      }),
    ).toEqual({ applied: 1, skipped: input.questions.length - 1, collisions: 0 });

    // 3. Повторный parse с исключением оставляет вопрос в javascript.
    const reparsed = await parseAll({
      rawDir: ws.rawDir,
      parsedPath: ws.parsedPath,
      overridesPath: ws.overridesPath,
    });
    const overridden = reparsed.find((item) => item.question === QUESTION);
    expect(overridden?.topic).toBe('javascript');
    expect(String(overridden?.id).startsWith('javascript-')).toBe(true);

    // 4. Повторный seed не мигрирует запись обратно и не добавляет дублей.
    const secondSeed = await seedQuestions({
      parsedPath: ws.parsedPath,
      questionsPath: ws.questionsPath,
    });
    expect(secondSeed).toEqual({ added: 0, migrated: 0, total: firstSeed.total });

    const after = await findStored(ws.questionsPath, QUESTION);
    expect(after?.topic).toBe('javascript');
    expect(String(after?.id).startsWith('javascript-')).toBe(true);
  });

  it('при коллизии id после исключения побеждает первая запись', async () => {
    const ws = await setup();
    await mkdir(path.join(ws.rawDir, 'yauhenkavalchuk'), { recursive: true });
    await cp(
      path.join(fixturesDir, 'yauhenkavalchuk-js.md'),
      path.join(ws.rawDir, 'yauhenkavalchuk/js.md'),
    );

    // Тот же вопрос есть у YauhenKavalchuk (javascript) и у Hexlet (soft-skills).
    // Исключение переводит Hexlet-запись в javascript, создавая коллизию id.
    const question = 'Что такое замыкание (Closure)?';
    await writeFile(
      path.join(ws.rawDir, 'hexlet/frontend.md'),
      [
        '',
        '## Middle',
        '',
        `### ${MIXED_HINT}`,
        '',
        `- ${question}`,
        '  <details>',
        '  <summary>Ответ</summary>',
        '',
        '  Ответ про замыкание.',
        '',
        '  </details>',
        '',
      ].join('\n'),
      { flag: 'a' },
    );
    await writeFile(
      ws.overridesPath,
      JSON.stringify([
        { source: 'hexlet', sourceUrl: HEXLET_URL, question, topic: 'javascript' },
      ]),
      'utf8',
    );

    const parsed = await parseAll({
      rawDir: ws.rawDir,
      parsedPath: ws.parsedPath,
      overridesPath: ws.overridesPath,
    });

    const collision = parsed.find((item) => item.question === question)!;
    expect(collision.topic).toBe('javascript');
    expect(collision.source).toBe('yauhenkavalchuk');
    expect(parsed.filter((item) => item.id === collision.id)).toHaveLength(1);
  });
});
