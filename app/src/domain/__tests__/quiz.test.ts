import { pickQuizQuestions } from '@/domain/quiz';
import type { Question } from '@/domain/types';

function makePool(size: number): Question[] {
  return Array.from({ length: size }, (_, index) => ({
    id: `q-${index}`,
    topic: 'javascript',
    grade: 'junior',
    question: `Вопрос ${index}`,
    options: ['a', 'b', 'c', 'd'],
    correctIndex: 0,
    explanation: '',
    code: null,
  }));
}

describe('pickQuizQuestions', () => {
  it('берёт случайные 15–20 вопросов из большого пула', () => {
    const picked = pickQuizQuestions(makePool(50), new Set(), () => 0.5);
    expect(picked).toHaveLength(18);
  });

  it('исключает решённые вопросы', () => {
    const solved = new Set(['q-0', 'q-1', 'q-2']);
    const picked = pickQuizQuestions(makePool(20), solved, () => 0.5);
    expect(picked).toHaveLength(17);
    expect(picked.map((question) => question.id)).not.toContain('q-0');
  });

  it('берёт все оставшиеся, если их меньше 15', () => {
    const solved = new Set(Array.from({ length: 45 }, (_, index) => `q-${index}`));
    const picked = pickQuizQuestions(makePool(50), solved, () => 0.5);
    expect(picked).toHaveLength(5);
  });

  it('возвращает пустой массив, когда всё решено', () => {
    const solved = new Set(makePool(10).map((question) => question.id));
    expect(pickQuizQuestions(makePool(10), solved, () => 0.5)).toEqual([]);
  });
});
