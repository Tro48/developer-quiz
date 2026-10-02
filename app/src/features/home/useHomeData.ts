import { useCallback, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';

import { getQuestionCounts } from '@/db/questions';
import { getSolvedCounts } from '@/db/progress';
import { getUserDb } from '@/db/userDb';
import {
  buildStats,
  computeGradeProgress,
  findCurrentGrade,
  type GradeProgress,
} from '@/domain/progress';
import { TOPICS, type Grade } from '@/domain/types';

type HomeData = {
  loading: boolean;
  error: boolean;
  progress: GradeProgress[];
  currentGrade: Grade | null;
  reload: () => void;
};

const EMPTY: Omit<HomeData, 'reload'> = {
  loading: true,
  error: false,
  progress: [],
  currentGrade: null,
};

export function useHomeData(): HomeData {
  const questionsDb = useSQLiteContext();
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<Omit<HomeData, 'reload'>>(EMPTY);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        try {
          const userDb = await getUserDb();
          const [totals, solved] = await Promise.all([
            getQuestionCounts(questionsDb),
            getSolvedCounts(userDb),
          ]);
          const stats = buildStats([...TOPICS], totals, solved);
          const progress = computeGradeProgress(stats);
          if (active) {
            setData({
              loading: false,
              error: false,
              progress,
              currentGrade: findCurrentGrade(progress),
            });
          }
        } catch (error) {
          console.error('Не удалось загрузить прогресс', error);
          if (active) {
            setData({ loading: false, error: true, progress: [], currentGrade: null });
          }
        }
      }

      void load();
      return () => {
        active = false;
      };
    }, [questionsDb, attempt])
  );

  const reload = useCallback(() => {
    setData((prev) => ({ ...prev, loading: true, error: false }));
    setAttempt((value) => value + 1);
  }, []);

  return { ...data, reload };
}
