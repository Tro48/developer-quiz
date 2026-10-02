import { GRADES, type Grade, type Topic } from './types';

export type CountRow = { topic: Topic; grade: Grade; total: number };
export type SolvedRow = { topic: Topic; grade: Grade; solved: number };

export type TopicGradeStats = { topic: Topic; grade: Grade; solved: number; total: number };

export type GradeProgress = {
  grade: Grade;
  solved: number;
  total: number;
  complete: boolean;
  unlocked: boolean;
};

export function buildStats(
  selectedTopics: Topic[],
  totals: CountRow[],
  solved: SolvedRow[]
): TopicGradeStats[] {
  return selectedTopics.flatMap((topic) =>
    GRADES.map((grade) => ({
      topic,
      grade,
      total: totals.find((row) => row.topic === topic && row.grade === grade)?.total ?? 0,
      solved: solved.find((row) => row.topic === topic && row.grade === grade)?.solved ?? 0,
    }))
  );
}

export function computeGradeProgress(stats: TopicGradeStats[]): GradeProgress[] {
  let previousComplete = true;

  return GRADES.map((grade) => {
    const gradeStats = stats.filter((row) => row.grade === grade);
    const total = gradeStats.reduce((sum, row) => sum + row.total, 0);
    const solved = gradeStats.reduce((sum, row) => sum + row.solved, 0);
    const complete = total > 0 && solved >= total;
    const progress: GradeProgress = { grade, solved, total, complete, unlocked: previousComplete };
    previousComplete = complete;
    return progress;
  });
}

export function findCurrentGrade(progress: GradeProgress[]): Grade | null {
  const current = progress.find((item) => item.unlocked && !item.complete);
  return current?.grade ?? null;
}
