import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { makeId } from '../tools/ids';
import { seedQuestions } from '../tools/seed';
import type { ParsedQuestion } from '../tools/types';

function makeParsed(topic: string, question: string): ParsedQuestion {
  return {
    id: makeId(topic, question),
    topic,
    topicHint: topic,
    source: 'yauhenkavalchuk',
    sourceUrl: 'https://youtu.be/example',
    question,
    answer: '',
    status: 'parsed',
  };
}

async function setup() {
  const root = await mkdtemp(path.join(tmpdir(), 'dq-seed-'));
  const parsedPath = path.join(root, 'parsed/all.json');
  const questionsPath = path.join(root, 'generated/questions.json');

  const questions = [
    makeParsed('javascript', 'Вопрос 1?'),
    makeParsed('javascript', 'Вопрос 2?'),
    makeParsed('javascript', 'Вопрос 3?'),
  ];
  await mkdir(path.dirname(parsedPath), { recursive: true });
  await writeFile(parsedPath, JSON.stringify(questions), 'utf8');

  return { root, parsedPath, questionsPath, questions };
}

async function readStore(filePath: string) {
  return JSON.parse(await readFile(filePath, 'utf8')) as Array<Record<string, unknown>>;
}

describe('seedQuestions', () => {
  it('создаёт рабочую базу из parsed-файла, если её ещё нет', async () => {
    const { parsedPath, questionsPath, questions } = await setup();

    const result = await seedQuestions({ parsedPath, questionsPath });

    expect(result).toEqual({ added: 3, total: 3 });
    const store = await readStore(questionsPath);
    expect(store).toEqual(questions);
    expect(store.every((question) => question.status === 'parsed')).toBe(true);
  });

  it('добавляет только новые вопросы и не трогает существующие статусы', async () => {
    const { parsedPath, questionsPath, questions } = await setup();
    const verified = {
      ...makeParsed('javascript', questions[0].question),
      grade: 'junior',
      status: 'verified',
      options: ['А', 'Б', 'В', 'Г'],
      correctIndex: 0,
      explanation: 'Пояснение.',
      docsRefs: ['https://developer.mozilla.org/ru/docs/Web/JavaScript'],
    };
    const foreign = makeParsed('css', 'Чужой вопрос?');
    await mkdir(path.dirname(questionsPath), { recursive: true });
    await writeFile(questionsPath, JSON.stringify([verified, foreign]), 'utf8');

    const result = await seedQuestions({ parsedPath, questionsPath });

    expect(result).toEqual({ added: 2, total: 4 });
    const store = await readStore(questionsPath);
    expect(store[0]).toEqual(verified);
    expect(store[1]).toEqual(foreign);
    expect(store.map((question) => question.id)).toEqual([
      verified.id,
      foreign.id,
      questions[1].id,
      questions[2].id,
    ]);
  });

  it('идемпотентен при повторном запуске', async () => {
    const { parsedPath, questionsPath } = await setup();

    await seedQuestions({ parsedPath, questionsPath });
    const second = await seedQuestions({ parsedPath, questionsPath });

    expect(second).toEqual({ added: 0, total: 3 });
  });

  it('падает, если parsed-файл отсутствует', async () => {
    const { questionsPath } = await setup();
    const missingPath = path.join(path.dirname(questionsPath), 'parsed/all.json');

    await expect(seedQuestions({ parsedPath: missingPath, questionsPath })).rejects.toThrow(
      /файл не найден/,
    );
  });
});
