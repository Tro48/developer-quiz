import type { Question } from '@/domain/types';

export type QuizPhase = 'answering' | 'feedback' | 'finished';

export type QuizState = {
  questions: Question[];
  index: number;
  selectedIndex: number | null;
  correctCount: number;
  phase: QuizPhase;
};

export type QuizAction =
  | { type: 'start'; questions: Question[] }
  | { type: 'answer'; optionIndex: number }
  | { type: 'next' };

export function createQuizState(questions: Question[]): QuizState {
  return {
    questions,
    index: 0,
    selectedIndex: null,
    correctCount: 0,
    phase: 'answering',
  };
}

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'start':
      return createQuizState(action.questions);

    case 'answer': {
      if (state.phase !== 'answering') {
        return state;
      }
      const question = state.questions[state.index];
      const isCorrect = action.optionIndex === question.correctIndex;
      return {
        ...state,
        selectedIndex: action.optionIndex,
        correctCount: state.correctCount + (isCorrect ? 1 : 0),
        phase: 'feedback',
      };
    }

    case 'next': {
      if (state.phase !== 'feedback') {
        return state;
      }
      const nextIndex = state.index + 1;
      if (nextIndex >= state.questions.length) {
        return { ...state, phase: 'finished' };
      }
      return { ...state, index: nextIndex, selectedIndex: null, phase: 'answering' };
    }

    default:
      return state;
  }
}
