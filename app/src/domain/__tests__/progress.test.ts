import { buildStats, computeGradeProgress, findCurrentGrade } from '@/domain/progress';
import type { Topic } from '@/domain/types';

const TOPICS: Topic[] = ['javascript', 'css'];

function stats() {
  return buildStats(
    TOPICS,
    [
      { topic: 'javascript', grade: 'junior', total: 10 },
      { topic: 'css', grade: 'junior', total: 5 },
      { topic: 'javascript', grade: 'middle', total: 8 },
      { topic: 'css', grade: 'middle', total: 4 },
    ],
    [{ topic: 'javascript', grade: 'junior', solved: 10 }]
  );
}

describe('computeGradeProgress', () => {
  it('открывает junior, но не middle, пока junior не закрыт', () => {
    const progress = computeGradeProgress(stats());

    expect(progress[0]).toMatchObject({ grade: 'junior', solved: 10, total: 15, complete: false, unlocked: true });
    expect(progress[1]).toMatchObject({ grade: 'middle', unlocked: false });
    expect(progress[2]).toMatchObject({ grade: 'senior', unlocked: false });
  });

  it('открывает следующий грейд после закрытия предыдущего', () => {
    const data = stats();
    data[0].solved = data[0].total;
    data[3].solved = data[3].total;
    data[1].solved = data[1].total;
    data[4].solved = data[4].total;
    const progress = computeGradeProgress(data);

    expect(progress[0]).toMatchObject({ complete: true });
    expect(progress[1]).toMatchObject({ unlocked: true, complete: true });
    expect(progress[2]).toMatchObject({ unlocked: true });
  });

  it('возвращает текущий незакрытый грейд и null, когда всё пройдено', () => {
    const progress = computeGradeProgress(stats());
    expect(findCurrentGrade(progress)).toBe('junior');

    const done = progress.map((item) => ({ ...item, complete: true }));
    expect(findCurrentGrade(done)).toBeNull();
  });
});
