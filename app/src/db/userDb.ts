import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

const USER_DB_NAME = 'user.db';
export const USER_DB_VERSION = 1;

let userDbPromise: Promise<SQLiteDatabase> | null = null;

export function getUserDb(): Promise<SQLiteDatabase> {
  if (!userDbPromise) {
    userDbPromise = openAndMigrate();
  }
  return userDbPromise;
}

async function openAndMigrate(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(USER_DB_NAME);
  await migrateUserDb(db);
  return db;
}

export async function migrateUserDb(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  if (version >= USER_DB_VERSION) {
    return;
  }
  if (version === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS solved_questions (
        question_id TEXT PRIMARY KEY NOT NULL,
        topic TEXT NOT NULL,
        grade TEXT NOT NULL,
        solved_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_solved_topic_grade
        ON solved_questions(topic, grade);
    `);
    version = 1;
  }
  await db.execAsync(`PRAGMA user_version = ${USER_DB_VERSION}`);
}
