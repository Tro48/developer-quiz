import { migrateUserDb, USER_DB_VERSION } from '@/db/userDb';
import { createTestDb } from '@/test-utils/testDb';

describe('migrateUserDb', () => {
  it('создаёт таблицы и выставляет версию', async () => {
    const db = createTestDb();

    await migrateUserDb(db);

    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(version?.user_version).toBe(USER_DB_VERSION);

    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table'"
    );
    expect(tables.map((table) => table.name)).toEqual(
      expect.arrayContaining(['settings', 'solved_questions'])
    );
  });

  it('идемпотентна', async () => {
    const db = createTestDb();

    await migrateUserDb(db);
    await expect(migrateUserDb(db)).resolves.toBeUndefined();
  });
});
