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

  it('не собирает банк при проблемах валидации', async () => {
    const { questionsPath, bankDir } = await setup();
    const broken = JSON.parse(await readFile(questionsPath, 'utf8'));
    broken[0].options = ['Один', 'один ', 'Два', 'Три'];
    await writeFile(questionsPath, JSON.stringify(broken), 'utf8');

    await expect(buildBank({ questionsPath, bankDir })).rejects.toThrow(/Банк не собран/);
  });
});
