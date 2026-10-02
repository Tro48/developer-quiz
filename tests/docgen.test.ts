import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  docgenStatus,
  emitDocgenBatch,
  mergeDocgenBatch,
  type DocgenOptions,
} from '../tools/docgen';
import { makeId } from '../tools/ids';
import { generatedQuestionSchema } from '../tools/types';

const BASIC_URL = 'https://developer.mozilla.org/ru/docs/Web/JavaScript/Guide/Introduction';
const FUNCTIONS_URL = 'https://developer.mozilla.org/ru/docs/Web/JavaScript/Guide/Functions';
const MEMORY_URL =
  'https://developer.mozilla.org/ru/docs/Web/JavaScript/Memory_management';
const TYPESCRIPT_URL = 'https://developer.mozilla.org/ru/docs/Glossary/TypeScript';

const DOC_MAP = [
  {
    id: 'js-basics',
    topic: 'javascript',
    title: 'Основы JavaScript',
    url: BASIC_URL,
    grade: 'junior',
  },
  {
    id: 'js-functions',
    topic: 'javascript',
    title: 'Функции',
    url: FUNCTIONS_URL,
    grade: 'middle',
  },
  {
    id: 'js-memory',
    topic: 'javascript',
    title: 'Управление памятью',
    url: MEMORY_URL,
    grade: 'senior',
  },
  {
    id: 'typescript-basics',
    topic: 'typescript',
    title: 'Основы TypeScript',
    url: TYPESCRIPT_URL,
    grade: 'junior',
  },
];

type Paths = {
  docMapDir: string;
  questionsPath: string;
  batchesDir: string;
};

async function setup(): Promise<Paths> {
  const root = await mkdtemp(path.join(tmpdir(), 'dq-docgen-'));
  const docMapDir = path.join(root, 'doc-map');
  const questionsPath = path.join(root, 'generated', 'questions.json');
  const batchesDir = path.join(root, 'batches');

  await mkdir(docMapDir, { recursive: true });
  await writeFile(path.join(docMapDir, 'javascript.json'), JSON.stringify(DOC_MAP), 'utf8');

  return { docMapDir, questionsPath, batchesDir };
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function emit(paths: Paths, opts: DocgenOptions = {}) {
  return emitDocgenBatch({ ...paths, ...opts });
}

function docgenResult(
  sectionId: string,
  topic: string,
  question: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    sectionId,
    topic,
    grade: 'junior',
    question,
    answer: 'Краткий ответ.',
    options: ['Вариант А', 'Вариант Б', 'Вариант В', 'Вариант Г'],
    correctIndex: 0,
    explanation: 'Пояснение к вопросу.',
    docsRefs: [BASIC_URL],
    ...overrides,
  };
}

async function writeOutput(
  paths: Paths,
  batchId: string,
  body: { results: unknown[]; skipped?: unknown[]; batchId?: string },
): Promise<string> {
  const outputPath = path.join(paths.batchesDir, 'docgen', `${batchId}.output.json`);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify({ batchId, ...body }), 'utf8');
  return outputPath;
}

describe('эмиссия docgen-батчей', () => {
  it('выдаёт только разделы темы порциями и не повторяет разделы из файлов батчей', async () => {
    const paths = await setup();

    const first = await emit(paths, {
      topic: 'javascript',
      size: 2,
      now: new Date('2026-10-02T15:30:00Z'),
    });
    expect(first?.batchId).toBe('docgen-20261002-153000');

    const firstInput = await readJsonFile<{
      kind: string;
      prompt: string;
      sections: Array<{ id: string; topic: string }>;
    }>(first!.inputPath);
    expect(firstInput.sections.map((section) => section.id)).toEqual(['js-basics', 'js-functions']);
    expect(firstInput.sections.every((section) => section.topic === 'javascript')).toBe(true);
    expect(firstInput.kind).toBe('docgen');
    expect(firstInput.prompt).toBe('tools/prompts/docgen.md');

    const second = await emit(paths, { topic: 'javascript', size: 2 });
    const secondInput = await readJsonFile<{ sections: Array<{ id: string }> }>(second!.inputPath);
    expect(secondInput.sections.map((section) => section.id)).toEqual(['js-memory']);

    const third = await emit(paths, { topic: 'javascript', size: 2 });
    expect(third).toBeNull();

    const fourth = await emit(paths, { topic: 'javascript', size: 2 });
    expect(fourth).toBeNull();
  });

  it('фильтрует разделы по грейду', async () => {
    const paths = await setup();

    const batch = await emit(paths, { topic: 'javascript', grade: 'senior' });
    const input = await readJsonFile<{ sections: Array<{ id: string }> }>(batch!.inputPath);

    expect(input.sections.map((section) => section.id)).toEqual(['js-memory']);
  });

  it('перевыдаёт раздел с rejected-записью, но не тратит skipped', async () => {
    const paths = await setup();
    await mkdir(path.dirname(paths.questionsPath), { recursive: true });
    await writeFile(
      paths.questionsPath,
      JSON.stringify([{ id: 'javascript-00000000', docSection: 'js-basics', status: 'rejected' }]),
      'utf8',
    );

    const oldInput = path.join(paths.batchesDir, 'docgen', 'docgen-20260101-000000.input.json');
    await mkdir(path.dirname(oldInput), { recursive: true });
    await writeFile(
      oldInput,
      JSON.stringify({
        batchId: 'docgen-20260101-000000',
        kind: 'docgen',
        sections: [{ id: 'js-basics' }, { id: 'js-functions' }],
      }),
      'utf8',
    );

    const batch = await emit(paths, { topic: 'javascript', size: 2 });
    const input = await readJsonFile<{ sections: Array<{ id: string }> }>(batch!.inputPath);
    expect(input.sections.map((section) => section.id)).toEqual(['js-basics', 'js-memory']);
  });

  it('не перевыдаёт rejected-раздел, если агент уже помечал его skipped', async () => {
    const paths = await setup();
    await mkdir(path.dirname(paths.questionsPath), { recursive: true });
    await writeFile(
      paths.questionsPath,
      JSON.stringify([{ id: 'javascript-00000000', docSection: 'js-basics', status: 'rejected' }]),
      'utf8',
    );

    const oldOutput = path.join(paths.batchesDir, 'docgen', 'docgen-20260101-000000.output.json');
    await mkdir(path.dirname(oldOutput), { recursive: true });
    await writeFile(
      oldOutput,
      JSON.stringify({
        batchId: 'docgen-20260101-000000',
        results: [],
        skipped: [{ sectionId: 'js-basics', reason: 'повторно не подошёл' }],
      }),
      'utf8',
    );

    const batch = await emit(paths, { topic: 'javascript', size: 1 });
    const input = await readJsonFile<{ sections: Array<{ id: string }> }>(batch!.inputPath);
    expect(input.sections.map((section) => section.id)).toEqual(['js-functions']);
  });

  it('не выдаёт раздел, у которого уже есть generated или verified', async () => {
    const paths = await setup();
    await mkdir(path.dirname(paths.questionsPath), { recursive: true });
    await writeFile(
      paths.questionsPath,
      JSON.stringify([{ id: 'javascript-00000000', docSection: 'js-basics', status: 'verified' }]),
      'utf8',
    );

    const batch = await emit(paths, { topic: 'javascript', size: 3 });
    const input = await readJsonFile<{ sections: Array<{ id: string }> }>(batch!.inputPath);
    expect(input.sections.map((section) => section.id)).toEqual(['js-functions', 'js-memory']);
  });
});

describe('merge docgen-батчей', () => {
  it('добавляет записи со статусом generated и каноническим id', async () => {
    const paths = await setup();
    const batch = await emit(paths, { topic: 'javascript', size: 3 });
    const outputPath = await writeOutput(paths, batch!.batchId, {
      results: [
        docgenResult('js-basics', 'javascript', 'Вопрос про основы?'),
        docgenResult('js-functions', 'javascript', 'Вопрос про функции?', {
          grade: 'middle',
          docsRefs: [FUNCTIONS_URL],
        }),
      ],
      skipped: [{ sectionId: 'js-memory', reason: 'слишком узкий раздел' }],
    });

    const result = await mergeDocgenBatch(outputPath, { questionsPath: paths.questionsPath });
    expect(result).toEqual({ added: 2, skipped: 1 });

    const store = await readJsonFile<Array<Record<string, unknown>>>(paths.questionsPath);
    expect(store).toHaveLength(2);

    const basics = store.find((question) => question.docSection === 'js-basics')!;
    expect(basics).toMatchObject({
      id: makeId('javascript', 'Вопрос про основы?'),
      topic: 'javascript',
      topicHint: 'Основы JavaScript',
      grade: 'junior',
      source: 'docgen',
      sourceUrl: BASIC_URL,
      docSection: 'js-basics',
      status: 'generated',
    });
    expect(String(basics.id).startsWith('javascript-')).toBe(true);
    expect(generatedQuestionSchema.safeParse(basics).success).toBe(true);
  });

  it('пропускает повторный merge того же файла', async () => {
    const paths = await setup();
    const batch = await emit(paths, { topic: 'javascript', size: 2 });
    const outputPath = await writeOutput(paths, batch!.batchId, {
      results: [
        docgenResult('js-basics', 'javascript', 'Вопрос 1?'),
        docgenResult('js-functions', 'javascript', 'Вопрос 2?', {
          grade: 'middle',
          docsRefs: [FUNCTIONS_URL],
        }),
      ],
    });

    expect(await mergeDocgenBatch(outputPath, { questionsPath: paths.questionsPath })).toEqual({
      added: 2,
      skipped: 0,
    });
    expect(await mergeDocgenBatch(outputPath, { questionsPath: paths.questionsPath })).toEqual({
      added: 0,
      skipped: 2,
    });

    const store = await readJsonFile<unknown[]>(paths.questionsPath);
    expect(store).toHaveLength(2);
  });

  it('падает на чужом batchId', async () => {
    const paths = await setup();
    const batch = await emit(paths, { topic: 'javascript', size: 1 });
    const outputPath = await writeOutput(paths, batch!.batchId, {
      batchId: 'docgen-19700101-000000',
      results: [docgenResult('js-basics', 'javascript', 'Вопрос?')],
    });

    await expect(
      mergeDocgenBatch(outputPath, { questionsPath: paths.questionsPath }),
    ).rejects.toThrow(/не совпадает/);
  });

  it('падает на sectionId не из батча', async () => {
    const paths = await setup();
    const batch = await emit(paths, { topic: 'javascript', size: 1 });
    const outputPath = await writeOutput(paths, batch!.batchId, {
      results: [docgenResult('js-unknown', 'javascript', 'Вопрос?')],
    });

    await expect(
      mergeDocgenBatch(outputPath, { questionsPath: paths.questionsPath }),
    ).rejects.toThrow(/не из батча/);
  });

  it('падает, если тема результата не совпадает с картой', async () => {
    const paths = await setup();
    const batch = await emit(paths, { topic: 'javascript', size: 1 });
    const outputPath = await writeOutput(paths, batch!.batchId, {
      results: [docgenResult('js-basics', 'typescript', 'Вопрос?')],
    });

    await expect(
      mergeDocgenBatch(outputPath, { questionsPath: paths.questionsPath }),
    ).rejects.toThrow(/не совпадает с картой/);
  });

  it('пропускает контент-дубль из другого раздела', async () => {
    const paths = await setup();
    const question = 'Что делает метод map?';
    const existing = {
      id: makeId('typescript', question),
      topic: 'typescript',
      topicHint: 'Основы TypeScript',
      grade: 'junior',
      source: 'docgen',
      sourceUrl: BASIC_URL,
      question,
      answer: 'Краткий ответ.',
      options: ['Вариант А', 'Вариант Б', 'Вариант В', 'Вариант Г'],
      correctIndex: 0,
      explanation: 'Пояснение к вопросу.',
      docsRefs: [BASIC_URL],
      status: 'generated',
      docSection: 'typescript-basics',
    };
    await mkdir(path.dirname(paths.questionsPath), { recursive: true });
    await writeFile(paths.questionsPath, JSON.stringify([existing]), 'utf8');

    const batch = await emit(paths, { topic: 'javascript', size: 1 });
    const outputPath = await writeOutput(paths, batch!.batchId, {
      results: [docgenResult('js-basics', 'javascript', question)],
    });

    const result = await mergeDocgenBatch(outputPath, { questionsPath: paths.questionsPath });
    expect(result).toEqual({ added: 0, skipped: 1 });

    const store = await readJsonFile<unknown[]>(paths.questionsPath);
    expect(store).toHaveLength(1);
  });

  it('падает, если выход покрывает не все разделы батча, и ничего не пишет', async () => {
    const paths = await setup();
    const batch = await emit(paths, { topic: 'javascript', size: 2 });
    const outputPath = await writeOutput(paths, batch!.batchId, {
      results: [docgenResult('js-basics', 'javascript', 'Вопрос?')],
    });

    await expect(
      mergeDocgenBatch(outputPath, { questionsPath: paths.questionsPath }),
    ).rejects.toThrow('Батч неполный, нет результата для разделов: js-functions');

    await expect(readFile(paths.questionsPath, 'utf8')).rejects.toThrow();
  });

  it('падает, если раздел встречается в выходе несколько раз', async () => {
    const paths = await setup();
    const batch = await emit(paths, { topic: 'javascript', size: 2 });
    const outputPath = await writeOutput(paths, batch!.batchId, {
      results: [
        docgenResult('js-basics', 'javascript', 'Вопрос 1?'),
        docgenResult('js-basics', 'javascript', 'Вопрос 2?'),
      ],
      skipped: [{ sectionId: 'js-functions', reason: 'не подошёл' }],
    });

    await expect(
      mergeDocgenBatch(outputPath, { questionsPath: paths.questionsPath }),
    ).rejects.toThrow(/Раздел указан несколько раз: js-basics/);
  });

  it('падает на грейде результата ниже грейда раздела', async () => {
    const paths = await setup();
    const batch = await emit(paths, { topic: 'javascript', size: 2 });
    const outputPath = await writeOutput(paths, batch!.batchId, {
      results: [
        docgenResult('js-functions', 'javascript', 'Вопрос про функции?', {
          grade: 'junior',
          docsRefs: [FUNCTIONS_URL],
        }),
      ],
      skipped: [{ sectionId: 'js-basics', reason: 'не подошёл' }],
    });

    await expect(
      mergeDocgenBatch(outputPath, { questionsPath: paths.questionsPath }),
    ).rejects.toThrow(/ниже грейда раздела/);
  });

  it('падает, если docsRefs не содержит URL раздела', async () => {
    const paths = await setup();
    const batch = await emit(paths, { topic: 'javascript', size: 2 });
    const outputPath = await writeOutput(paths, batch!.batchId, {
      results: [
        docgenResult('js-functions', 'javascript', 'Вопрос про функции?', {
          grade: 'middle',
          docsRefs: [BASIC_URL],
        }),
      ],
      skipped: [{ sectionId: 'js-basics', reason: 'не подошёл' }],
    });

    await expect(
      mergeDocgenBatch(outputPath, { questionsPath: paths.questionsPath }),
    ).rejects.toThrow(/docsRefs/);
  });
});

describe('docgenStatus', () => {
  it('считает total, covered и verified по темам', async () => {
    const paths = await setup();
    const batch = await emit(paths, { topic: 'javascript', size: 2 });
    const outputPath = await writeOutput(paths, batch!.batchId, {
      results: [
        docgenResult('js-basics', 'javascript', 'Вопрос про основы?'),
        docgenResult('js-functions', 'javascript', 'Вопрос про функции?', {
          grade: 'middle',
          docsRefs: [FUNCTIONS_URL],
        }),
      ],
    });
    await mergeDocgenBatch(outputPath, { questionsPath: paths.questionsPath });

    const rows = await docgenStatus({
      docMapDir: paths.docMapDir,
      questionsPath: paths.questionsPath,
    });
    expect(rows.find((row) => row.topic === 'javascript')).toEqual({
      topic: 'javascript',
      total: 3,
      covered: 2,
      verified: 0,
      rejected: 0,
    });
    expect(rows.find((row) => row.topic === 'typescript')).toEqual({
      topic: 'typescript',
      total: 1,
      covered: 0,
      verified: 0,
      rejected: 0,
    });

    const totals = rows.reduce(
      (acc, row) => ({
        total: acc.total + row.total,
        covered: acc.covered + row.covered,
        verified: acc.verified + row.verified,
        rejected: acc.rejected + row.rejected,
      }),
      { total: 0, covered: 0, verified: 0, rejected: 0 },
    );
    expect(totals).toEqual({ total: 4, covered: 2, verified: 0, rejected: 0 });

    const store = await readJsonFile<Array<Record<string, unknown>>>(paths.questionsPath);
    store[0] = { ...store[0], status: 'verified' };
    store.push({
      ...store[0],
      id: 'javascript-rejected',
      status: 'rejected',
      rejectReason: 'верификация: неточность',
    });
    await writeFile(paths.questionsPath, JSON.stringify(store), 'utf8');

    const updated = await docgenStatus({
      docMapDir: paths.docMapDir,
      questionsPath: paths.questionsPath,
    });
    expect(updated.find((row) => row.topic === 'javascript')).toEqual({
      topic: 'javascript',
      total: 3,
      covered: 2,
      verified: 1,
      rejected: 1,
    });
  });
});
