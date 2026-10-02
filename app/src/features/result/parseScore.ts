export type ScoreParams = { correct?: string; total?: string };

export function parseScore(params: ScoreParams): { correct: number; total: number } {
  const correct = Number.parseInt(params.correct ?? '', 10);
  const total = Number.parseInt(params.total ?? '', 10);
  return {
    correct: Number.isFinite(correct) ? correct : 0,
    total: Number.isFinite(total) ? total : 0,
  };
}
