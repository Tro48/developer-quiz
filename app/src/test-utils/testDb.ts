import Database from 'better-sqlite3';
import type { SQLiteDatabase } from 'expo-sqlite';

type Params = unknown[] | Record<string, unknown> | undefined;

function runStatement(statement: Database.Statement, params: Params): void {
  if (Array.isArray(params)) {
    statement.run(...params);
  } else if (params) {
    statement.run(params);
  } else {
    statement.run();
  }
}

function getRow<T>(statement: Database.Statement, params: Params): T | null {
  const row =
    Array.isArray(params)
      ? statement.get(...params)
      : params
        ? statement.get(params)
        : statement.get();
  return (row as T | undefined) ?? null;
}

export function createTestDb(): SQLiteDatabase {
  const db = new Database(':memory:');

  const adapter = {
    execAsync: async (sql: string) => {
      db.exec(sql);
    },
    runAsync: async (sql: string, params?: Params) => {
      runStatement(db.prepare(sql), params);
    },
    getFirstAsync: async <T>(sql: string, params?: Params) => getRow<T>(db.prepare(sql), params),
    getAllAsync: async <T>(sql: string, params?: Params) => {
      const rows = Array.isArray(params)
        ? db.prepare(sql).all(...params)
        : params
          ? db.prepare(sql).all(params)
          : db.prepare(sql).all();
      return rows as T[];
    },
  };

  return adapter as unknown as SQLiteDatabase;
}
