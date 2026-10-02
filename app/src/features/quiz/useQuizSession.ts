import { useCallback, useEffect, useReducer, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getQuestionPool } from '@/db/questions';
import { getSolvedIds, markSolved } from '@/db/progress';
import { getUserDb } from '@/db/userDb';
import { pickQuizQuestions } from '@/domain/quiz';
import { TOPICS, type Grade } from '@/domain/types';

import { createQuizState, quizReducer, type QuizState } from './quizReducer';

type QuizSession = {
  state: QuizState;
  loading: boolean;
  answer: (optionIndex: number) => void;
  next: () => void;
};

export function useQuizSession(grade: Grade): QuizSession {
  const questionsDb = useSQLiteContext();
  const [userDb, setUserDb] = useState<SQLiteDatabase | null>(null);
  const [loading, setLoading] = useState(true);
  const [state, dispatch] = useReducer(quizReducer, undefined, () => createQuizState([]));

  useEffect(() => {
    let active = true;

    async function load() {
      const db = await getUserDb();
      const [pool, solvedIds] = await Promise.all([
        getQuestionPool(questionsDb, { grade, topics: [...TOPICS] }),
        getSolvedIds(db),
      ]);
      const picked = pickQuizQuestions(pool, new Set(solvedIds));
      if (active) {
        setUserDb(db);
        dispatch({ type: 'start', questions: picked });
        setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [questionsDb, grade]);

  const answer = useCallback(
    (optionIndex: number) => {
      const question = state.questions[state.index];
      if (userDb && question && optionIndex === question.correctIndex) {
        void markSolved(userDb, question);
      }
      dispatch({ type: 'answer', optionIndex });
    },
    [state.questions, state.index, userDb]
  );

  const next = useCallback(() => dispatch({ type: 'next' }), []);

  return { state, loading, answer, next };
}
