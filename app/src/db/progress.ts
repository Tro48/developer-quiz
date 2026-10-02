import type { SQLiteDatabase } from 'expo-sqlite';

import type { Grade, Topic } from '@/domain/types';

export type SolvedCount = { topic: Topic; grade: Grade; solved: number };

export async function getSolvedIds(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ question_id: string }>(
    'SELECT question_id FROM solved_questions'
  );
  return rows.map((row) => row.question_id);
}

export async function getSolvedCounts(db: SQLiteDatabase): Promise<SolvedCount[]> {
  return db.getAllAsync<SolvedCount>(
    'SELECT topic, grade, COUNT(*) AS solved FROM solved_questions GROUP BY topic, grade'
  );
}

export async function markSolved(
  db: SQLiteDatabase,
  question: { id: string; topic: Topic; grade: Grade }
): Promise<void> {
  await db.runAsync(
    `INSERT OR IGNORE INTO solved_questions (question_id, topic, grade, solved_at)
     VALUES (?, ?, ?, ?)`,
    [question.id, question.topic, question.grade, Date.now()]
  );
}
