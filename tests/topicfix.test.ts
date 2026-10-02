import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { makeId } from '../tools/ids';
import {
  DEFAULT_MIXED_HINT,
  emitTopicfixBatch,
  mergeTopicfixBatch,
  type TopicfixOptions,
} from '../tools/topicfix';
import {
  generatedQuestionSchema,
  parsedQuestionSchema,
  type ParsedQuestion,
} from '../tools/types';

const MIXED_HINT = 'Frontend и верстка (HTML/CSS)';
const SOURCE_URL = 'https://ru.hexlet.io/courses/js-basics';

type Paths = {
  questionsPath: string;
  batchesDir: string;
  questions: ParsedQuestion[];
};

function parsedQuestion(
  question: string,
  topicHint: string,
  overrides: Partial<ParsedQuestion> = {},
): ParsedQuestion {
  const topic = overrides.topic ?? 'css';
  return parsedQuestionSchema.parse({
    id: makeId(topic, question),
    topic,
    topicHint,
    source: 'hexlet',
    sourceUrl: SOURCE_URL,
    question,
    answer: 'Ответ на вопрос.',
    status: 'parsed',
    ...overrides,
  });
}

async function setup(): Promise<Paths> {
  const root = await mkdtemp(path.join(tmpdir(), 'dq-topicfix-'));
  const questionsPath = path.join(root, 'generated', 'questions.json');
  const batchesDir = path.join(root, 'batches');

  const questions = [
    parsedQuestion('Что делает тег section?', MIXED_HINT),
    parsedQuestion('Как работает каскад стилей?', MIXED_HINT),
    parsedQuestion('Что такое замыкание?', 'JavaScript'),
  ];
  const generated = generatedQuestionSchema.parse({
    id: makeId('css', 'Что такое блочная модель?'),
    topic: 'css',
    topicHint: MIXED_HINT,
    grade: 'junior',
    source: 'hexlet',
    sourceUrl: SOURCE_URL,
    question: 'Что такое блочная модель?',
    answer: 'Схема расчёта размеров элемента.',
    options: ['Вариант А', 'Вариант Б', 'Вариант В', 'Вариант Г'],
    correctIndex: 0,
    explanation: 'Пояснение к вопросу.',
    docsRefs: [SOURCE_URL],
    status: 'generated',
  });

  await mkdir(path.dirname(questionsPath), { recursive: true });
  await writeFile(questionsPath, JSON.stringify([...questions, generated]), 'utf8');

  return { questionsPath, batchesDir, questions };
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function emit(paths: Paths, opts: TopicfixOptions = {}) {
  return emitTopicfixBatch({
    questionsPath: paths.questionsPath,
    batchesDir: paths.batchesDir,
    now: new Date('2026-10-02T17:00:00Z'),
    ...opts,
  });
}

async function writeOutput(
  paths: Paths,
  batchId: string,
  assignments: Array<{ id: string; topic: string }>,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const outputPath = path.join(paths.batchesDir, 'topicfix', `${batchId}.output.json`);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify({ batchId, assignments, ...overrides }), 'utf8');
  return outputPath;
}

describe('эмиссия topicfix-батчей', () => {
  it('выбирает parsed-вопросы смешанной секции и не повторяет их', async () => {
    const paths = await setup();

    expect(DEFAULT_MIXED_HINT).toBe(MIXED_HINT);
    const first = await emit(paths);
    expect(first?.batchId).toBe('topicfix-20261002-170000');

    const input = await readJsonFile<{
      kind: string;
      prompt: string;
      hint: string;
      questions: Array<{ id: string }>;
    }>(first!.inputPath);
    expect(input.questions.map((question) => question.id)).toEqual([
      paths.questions[0].id,
      paths.questions[1].id,
    ]);
    expect(input.kind).toBe('topicfix');
    expect(input.hint).toBe(MIXED_HINT);
    expect(input.prompt).toBe('tools/prompts/topicfix.md');

    expect(await emit(paths)).toBeNull();
  });
});

describe('merge topicfix-батчей', () => {
  it('переносит записи на html/css, сохраняя статус и содержимое', async () => {
    const paths = await setup();
    const batch = await emit(paths);
    const [first, second] = paths.questions;
    const outputPath = await writeOutput(paths, batch!.batchId, [
      { id: first.id, topic: 'html' },
      { id: second.id, topic: 'css' },
    ]);

    expect(await mergeTopicfixBatch(outputPath, { questionsPath: paths.questionsPath })).toEqual({
      applied: 2,
      skipped: 0,
      collisions: 0,
    });

    const store = await readJsonFile<Array<Record<string, unknown>>>(paths.questionsPath);
    expect(store).toHaveLength(4);

    const htmlRecord = store.find((record) => record.id === makeId('html', first.question))!;
    expect(String(htmlRecord.id).startsWith('html-')).toBe(true);
    expect(htmlRecord).toMatchObject({
      topic: 'html',
      status: 'parsed',
      question: first.question,
      answer: first.answer,
    });

    const cssRecord = store.find((record) => record.id === makeId('css', second.question))!;
    expect(String(cssRecord.id).startsWith('css-')).toBe(true);
    expect(cssRecord).toMatchObject({
      topic: 'css',
      status: 'parsed',
      question: second.question,
      answer: second.answer,
    });
  });

  it('пропускает повторный merge того же файла', async () => {
    const paths = await setup();
    const batch = await emit(paths);
    const [first, second] = paths.questions;
    const outputPath = await writeOutput(paths, batch!.batchId, [
      { id: first.id, topic: 'html' },
      { id: second.id, topic: 'html' },
    ]);

    expect(await mergeTopicfixBatch(outputPath, { questionsPath: paths.questionsPath })).toEqual({
      applied: 2,
      skipped: 0,
      collisions: 0,
    });
    expect(await mergeTopicfixBatch(outputPath, { questionsPath: paths.questionsPath })).toEqual({
      applied: 0,
      skipped: 2,
      collisions: 0,
    });

    const store = await readJsonFile<unknown[]>(paths.questionsPath);
    expect(store).toHaveLength(4);
  });

  it('считает коллизию и не затирает занятую запись', async () => {
    const paths = await setup();
    const batch = await emit(paths);
    const [first, second] = paths.questions;
    const outputPath = await writeOutput(paths, batch!.batchId, [
      { id: first.id, topic: 'html' },
      { id: second.id, topic: 'css' },
    ]);

    const occupied = parsedQuestion(first.question, 'Другая секция', {
      topic: 'html',
      answer: 'Чужой ответ.',
    });
    const store = await readJsonFile<Array<Record<string, unknown>>>(paths.questionsPath);
    store.push(occupied);
    await writeFile(paths.questionsPath, JSON.stringify(store), 'utf8');

    expect(await mergeTopicfixBatch(outputPath, { questionsPath: paths.questionsPath })).toEqual({
      applied: 1,
      skipped: 0,
      collisions: 1,
    });

    const after = await readJsonFile<Array<Record<string, unknown>>>(paths.questionsPath);
    expect(after).toHaveLength(5);

    const occupiedRecord = after.find((record) => record.id === occupied.id)!;
    expect(occupiedRecord).toMatchObject({
      topic: 'html',
      status: 'parsed',
      question: first.question,
      answer: 'Чужой ответ.',
    });

    const keptRecord = after.find((record) => record.id === first.id)!;
    expect(keptRecord).toMatchObject({
      topic: 'css',
      status: 'parsed',
      answer: first.answer,
    });
  });

  it('падает на id не из батча', async () => {
    const paths = await setup();
    const batch = await emit(paths);
    const outputPath = await writeOutput(paths, batch!.batchId, [
      { id: 'css-deadbeef', topic: 'css' },
    ]);

    await expect(
      mergeTopicfixBatch(outputPath, { questionsPath: paths.questionsPath }),
    ).rejects.toThrow(/не из батча/);
  });

  it('падает на неизвестной теме', async () => {
    const paths = await setup();
    const batch = await emit(paths);
    const outputPath = await writeOutput(paths, batch!.batchId, [
      { id: paths.questions[0].id, topic: 'python' },
    ]);

    await expect(
      mergeTopicfixBatch(outputPath, { questionsPath: paths.questionsPath }),
    ).rejects.toThrow(/Неизвестная тема/);
  });

  it('падает на чужом batchId', async () => {
    const paths = await setup();
    const batch = await emit(paths);
    const outputPath = await writeOutput(
      paths,
      batch!.batchId,
      [{ id: paths.questions[0].id, topic: 'html' }],
      { batchId: 'topicfix-19700101-000000' },
    );

    await expect(
      mergeTopicfixBatch(outputPath, { questionsPath: paths.questionsPath }),
    ).rejects.toThrow(/не совпадает/);
  });
});
