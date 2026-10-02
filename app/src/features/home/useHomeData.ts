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
  progress: GradeProgress[];
  currentGrade: Grade | null;
};

const EMPTY: HomeData = { loading: true, progress: [], currentGrade: null };

export function useHomeData(): HomeData {
  const questionsDb = useSQLiteContext();
  const [data, setData] = useState<HomeData>(EMPTY);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        const userDb = await getUserDb();
        const [totals, solved] = await Promise.all([
          getQuestionCounts(questionsDb),
          getSolvedCounts(userDb),
        ]);
        const stats = buildStats([...TOPICS], totals, solved);
        const progress = computeGradeProgress(stats);
        if (active) {
          setData({ loading: false, progress, currentGrade: findCurrentGrade(progress) });
        }
      }

      void load();
      return () => {
        active = false;
      };
    }, [questionsDb])
  );

  return data;
}
