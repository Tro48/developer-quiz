import { randomInt, type Rng } from '@/lib/random';

import type { Question } from './types';

export const QUIZ_MIN_SIZE = 15;
export const QUIZ_MAX_SIZE = 20;

export function pickQuizQuestions(
  pool: Question[],
  solvedIds: ReadonlySet<string>,
  rng: Rng = Math.random
): Question[] {
  const unanswered = pool.filter((question) => !solvedIds.has(question.id));

  if (unanswered.length === 0) {
    return [];
  }
  const target =
    unanswered.length < QUIZ_MIN_SIZE
      ? unanswered.length
      : randomInt(QUIZ_MIN_SIZE, QUIZ_MAX_SIZE, rng);
  const size = Math.min(target, unanswered.length);

  return shuffle(unanswered, rng).slice(0, size);
}

export function shuffle<T>(items: T[], rng: Rng = Math.random): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
