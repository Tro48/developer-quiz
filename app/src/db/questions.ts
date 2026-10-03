import type { SQLiteDatabase } from 'expo-sqlite';

import type { Grade, Question, Topic } from '@/domain/types';

type QuestionRow = {
  id: string;
  topic: string;
  grade: string;
  question: string;
  options_json: string;
  correct_index: number;
  explanation: string;
  code: string | null;
};

export type QuestionCount = { topic: Topic; grade: Grade; total: number };

export async function getQuestionPool(
  db: SQLiteDatabase,
  filters: { grade: Grade; topics: Topic[] }
): Promise<Question[]> {
  if (filters.topics.length === 0) {
    return [];
  }
  const placeholders = filters.topics.map(() => '?').join(', ');
  const rows = await db.getAllAsync<QuestionRow>(
    `SELECT id, topic, grade, question, options_json, correct_index, explanation, code
     FROM questions
     WHERE grade = ? AND topic IN (${placeholders})`,
    [filters.grade, ...filters.topics]
  );
  return rows.map(toQuestion);
}

export async function getQuestionCounts(db: SQLiteDatabase): Promise<QuestionCount[]> {
  return db.getAllAsync<QuestionCount>(
    'SELECT topic, grade, COUNT(*) AS total FROM questions GROUP BY topic, grade'
  );
}

export async function getAllQuestionIds(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ id: string }>('SELECT id FROM questions');
  return rows.map((row) => row.id);
}

function toQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    topic: row.topic as Topic,
    grade: row.grade as Grade,
    question: row.question,
    options: JSON.parse(row.options_json) as string[],
    correctIndex: row.correct_index,
    explanation: row.explanation,
    code: row.code ?? null,
  };
}
