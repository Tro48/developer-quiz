import { getSolvedCounts, getSolvedIds, markSolved, pruneSolved } from '@/db/progress';
import { createTestDb } from '@/test-utils/testDb';
import { migrateUserDb } from '@/db/userDb';

describe('progress', () => {
  it('сохраняет решённый вопрос идемпотентно', async () => {
    const db = createTestDb();
    await migrateUserDb(db);
    const question = { id: 'js-1', topic: 'javascript', grade: 'junior' } as const;

    await markSolved(db, question);
    await markSolved(db, question);

    await expect(getSolvedIds(db)).resolves.toEqual(['js-1']);
    await expect(getSolvedCounts(db)).resolves.toEqual([
      { topic: 'javascript', grade: 'junior', solved: 1 },
    ]);
  });

  it('удаляет решённые вопросы, которых нет в текущем банке', async () => {
    const db = createTestDb();
    await migrateUserDb(db);
    await markSolved(db, { id: 'js-1', topic: 'javascript', grade: 'junior' });
    await markSolved(db, { id: 'js-old', topic: 'javascript', grade: 'junior' });

    await pruneSolved(db, ['js-1']);

    await expect(getSolvedIds(db)).resolves.toEqual(['js-1']);
    await expect(getSolvedCounts(db)).resolves.toEqual([
      { topic: 'javascript', grade: 'junior', solved: 1 },
    ]);
  });
});
