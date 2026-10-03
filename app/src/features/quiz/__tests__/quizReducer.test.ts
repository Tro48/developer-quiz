import { createQuizState, quizReducer } from '@/features/quiz/quizReducer';
import type { Question } from '@/domain/types';

const questions: Question[] = [
  {
    id: 'q-1',
    topic: 'javascript',
    grade: 'junior',
    question: 'Первый?',
    options: ['a', 'b', 'c', 'd'],
    correctIndex: 1,
    explanation: 'Потому что.',
    code: null,
  },
  {
    id: 'q-2',
    topic: 'javascript',
    grade: 'junior',
    question: 'Второй?',
    options: ['a', 'b', 'c', 'd'],
    correctIndex: 0,
    explanation: 'Так.',
    code: null,
  },
];

describe('quizReducer', () => {
  it('показывает пояснение и считает верный ответ', () => {
    const state = quizReducer(createQuizState(questions), { type: 'answer', optionIndex: 1 });

    expect(state.phase).toBe('feedback');
    expect(state.selectedIndex).toBe(1);
    expect(state.correctCount).toBe(1);
  });

  it('не считает неверный ответ', () => {
    const state = quizReducer(createQuizState(questions), { type: 'answer', optionIndex: 3 });

    expect(state.correctCount).toBe(0);
    expect(state.phase).toBe('feedback');
  });

  it('игнорирует повторный ответ в фазе пояснения', () => {
    const answered = quizReducer(createQuizState(questions), { type: 'answer', optionIndex: 1 });
    const again = quizReducer(answered, { type: 'answer', optionIndex: 0 });

    expect(again).toBe(answered);
  });

  it('переходит к следующему вопросу', () => {
    const answered = quizReducer(createQuizState(questions), { type: 'answer', optionIndex: 1 });
    const next = quizReducer(answered, { type: 'next' });

    expect(next.index).toBe(1);
    expect(next.phase).toBe('answering');
    expect(next.selectedIndex).toBeNull();
  });

  it('завершает квиз после последнего вопроса', () => {
    let state = createQuizState(questions);
    state = quizReducer(state, { type: 'answer', optionIndex: 1 });
    state = quizReducer(state, { type: 'next' });
    state = quizReducer(state, { type: 'answer', optionIndex: 0 });
    state = quizReducer(state, { type: 'next' });

    expect(state.phase).toBe('finished');
    expect(state.correctCount).toBe(2);
  });
});
