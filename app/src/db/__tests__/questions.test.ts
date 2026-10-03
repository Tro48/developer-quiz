import { getQuestionCounts, getQuestionPool } from '@/db/questions';
import { createTestDb } from '@/test-utils/testDb';

const SETUP = `
CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  grade TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  options_json TEXT NOT NULL,
  correct_index INTEGER NOT NULL,
  explanation TEXT NOT NULL,
  code TEXT,
  docs_refs_json TEXT NOT NULL,
  doc_section TEXT,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL
);
INSERT INTO questions VALUES ('js-1', 'javascript', 'junior', 'Вопрос 1', 'ответ', '["a","b","c","d"]', 2, 'Пояснение', 'const x = 1;', '[]', NULL, 'src', 'url');
INSERT INTO questions VALUES ('css-1', 'css', 'junior', 'Вопрос 2', 'ответ', '["a","b","c","d"]', 0, 'Пояснение', NULL, '[]', NULL, 'src', 'url');
INSERT INTO questions VALUES ('js-2', 'javascript', 'middle', 'Вопрос 3', 'ответ', '["a","b","c","d"]', 1, 'Пояснение', NULL, '[]', NULL, 'src', 'url');
`;

describe('questions', () => {
  it('выбирает пул по грейду и темам и разбирает варианты', async () => {
    const db = createTestDb();
    await db.execAsync(SETUP);

    const pool = await getQuestionPool(db, { grade: 'junior', topics: ['javascript'] });

    expect(pool).toHaveLength(1);
    expect(pool[0]).toEqual({
      id: 'js-1',
      topic: 'javascript',
      grade: 'junior',
      question: 'Вопрос 1',
      options: ['a', 'b', 'c', 'd'],
      correctIndex: 2,
      explanation: 'Пояснение',
      code: 'const x = 1;',
    });
  });

  it('считает вопросы по темам и грейдам', async () => {
    const db = createTestDb();
    await db.execAsync(SETUP);

    const counts = await getQuestionCounts(db);

    expect(counts).toEqual(
      expect.arrayContaining([
        { topic: 'javascript', grade: 'junior', total: 1 },
        { topic: 'css', grade: 'junior', total: 1 },
        { topic: 'javascript', grade: 'middle', total: 1 },
      ])
    );
  });
});
