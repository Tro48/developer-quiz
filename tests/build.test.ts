import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { buildBank } from '../tools/build';

function question(id: string, status: string) {
  return {
    id,
    topic: 'javascript',
    source: 'hexlet',
    sourceUrl: 'https://example.com/frontend.md',
    question: `Вопрос ${id}?`,
    answer: 'Ответ.',
    grade: 'junior',
    options: [`${id} А`, `${id} Б`, `${id} В`, `${id} Г`],
    correctIndex: 1,
    explanation: 'Пояснение.',
    docsRefs: ['https://developer.mozilla.org/ru/docs/Web/JavaScript'],
    status,
  };
}

async function setup() {
  const root = await mkdtemp(path.join(tmpdir(), 'dq-build-'));
  const questionsPath = path.join(root, 'generated/questions.json');
  const bankDir = path.join(root, 'bank');
  await mkdir(path.dirname(questionsPath), { recursive: true });
  await writeFile(
    questionsPath,
    JSON.stringify([
      question('javascript-11111111', 'verified'),
      question('javascript-22222222', 'verified'),
      question('javascript-33333333', 'generated'),
      question('javascript-44444444', 'rejected'),
    ]),
    'utf8',
  );
  return { questionsPath, bankDir };
}

describe('buildBank', () => {
  it('собирает JSON и SQLite только из verified', async () => {
    const { questionsPath, bankDir } = await setup();
    const result = await buildBank({ questionsPath, bankDir });

    expect(result.total).toBe(2);
    const bankJson = JSON.parse(await readFile(result.jsonPath, 'utf8'));
    expect(bankJson).toHaveLength(2);

    const db = new Database(result.dbPath, { readonly: true });
    const row = db.prepare('select count(*) as count from questions').get() as { count: number };
    const sample = db
      .prepare('select options_json, correct_index from questions where id = ?')
      .get('javascript-11111111') as { options_json: string; correct_index: number };
    db.close();

    expect(row.count).toBe(2);
    expect(JSON.parse(sample.options_json)).toHaveLength(4);
    expect(sample.correct_index).toBe(1);
  });

  it('переносит docSection verified-вопроса в JSON и колонку doc_section', async () => {
    const { questionsPath, bankDir } = await setup();
    const questions = JSON.parse(await readFile(questionsPath, 'utf8'));
    questions[0] = { ...questions[0], docSection: 'data-types' };
    await writeFile(questionsPath, JSON.stringify(questions), 'utf8');

    const result = await buildBank({ questionsPath, bankDir });

    const bankJson = JSON.parse(await readFile(result.jsonPath, 'utf8'));
    const withSection = bankJson.find((item: { id: string }) => item.id === 'javascript-11111111');
    expect(withSection.docSection).toBe('data-types');

    const db = new Database(result.dbPath, { readonly: true });
    const rows = db
      .prepare('select id, doc_section from questions order by id')
      .all() as { id: string; doc_section: string | null }[];
    db.close();

    expect(rows).toEqual([
      { id: 'javascript-11111111', doc_section: 'data-types' },
      { id: 'javascript-22222222', doc_section: null },
    ]);
  });

  it('переносит code verified-вопроса в JSON и колонку code', async () => {
    const { questionsPath, bankDir } = await setup();
    const code = 'const x = 1;\nif (x) {\n  console.log(x);\n}';
    const questions = JSON.parse(await readFile(questionsPath, 'utf8'));
    questions[0] = { ...questions[0], code };
    await writeFile(questionsPath, JSON.stringify(questions), 'utf8');

    const result = await buildBank({ questionsPath, bankDir });

    const bankJson = JSON.parse(await readFile(result.jsonPath, 'utf8'));
    const withCode = bankJson.find((item: { id: string }) => item.id === 'javascript-11111111');
    expect(withCode.code).toBe(code);

    const db = new Database(result.dbPath, { readonly: true });
    const rows = db
      .prepare('select id, code from questions order by id')
      .all() as { id: string; code: string | null }[];
    db.close();

    expect(rows).toEqual([
      { id: 'javascript-11111111', code },
      { id: 'javascript-22222222', code: null },
    ]);
  });

  it('не собирает банк при проблемах валидации и ничего не пишет', async () => {
    const { questionsPath, bankDir } = await setup();
    const broken = JSON.parse(await readFile(questionsPath, 'utf8'));
    broken[0].options = ['Один', 'один ', 'Два', 'Три'];
    await writeFile(questionsPath, JSON.stringify(broken), 'utf8');

    await expect(buildBank({ questionsPath, bankDir })).rejects.toThrow(/Банк не собран/);
    await expect(readFile(path.join(bankDir, 'questions.json'), 'utf8')).rejects.toThrow();
    await expect(readFile(path.join(bankDir, 'questions.db'))).rejects.toThrow();
  });

  it('падает на verified-записи, не проходящей схему вопроса', async () => {
    const { questionsPath, bankDir } = await setup();
    const broken = JSON.parse(await readFile(questionsPath, 'utf8'));
    broken[0] = { ...broken[0], docsRefs: [] };
    await writeFile(questionsPath, JSON.stringify(broken), 'utf8');

    await expect(buildBank({ questionsPath, bankDir })).rejects.toThrow(/схему вопроса/);
  });

  it('падает на битом файле базы', async () => {
    const { questionsPath, bankDir } = await setup();
    await writeFile(questionsPath, '{ сломано', 'utf8');

    await expect(buildBank({ questionsPath, bankDir })).rejects.toThrow(/Банк не собран/);
  });

  it('падает, если файла базы нет, и не затирает существующий банк', async () => {
    const { questionsPath, bankDir } = await setup();
    await mkdir(bankDir, { recursive: true });
    await writeFile(path.join(bankDir, 'questions.json'), '[]', 'utf8');

    const missingPath = path.join(path.dirname(questionsPath), 'нет.json');
    await expect(buildBank({ questionsPath: missingPath, bankDir })).rejects.toThrow(
      /файл не найден/,
    );
    expect(await readFile(path.join(bankDir, 'questions.json'), 'utf8')).toBe('[]');
  });

  it('падает на null в базе', async () => {
    const { questionsPath, bankDir } = await setup();
    await writeFile(questionsPath, JSON.stringify([null]), 'utf8');

    await expect(buildBank({ questionsPath, bankDir })).rejects.toThrow(/не объект/);
  });
});
