import { getSetting, setSetting } from '@/db/settings';
import { createTestDb } from '@/test-utils/testDb';
import { migrateUserDb } from '@/db/userDb';

describe('settings', () => {
  it('возвращает null для незаданного ключа', async () => {
    const db = createTestDb();
    await migrateUserDb(db);
    await expect(getSetting(db, 'theme')).resolves.toBeNull();
  });

  it('сохраняет и обновляет значение', async () => {
    const db = createTestDb();
    await migrateUserDb(db);

    await setSetting(db, 'theme', 'dark');
    await setSetting(db, 'theme', 'light');

    await expect(getSetting(db, 'theme')).resolves.toBe('light');
  });
});
