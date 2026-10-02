export const ru = {
  common: {
    loading: 'Загрузка…',
    error: 'Что-то пошло не так',
    startupError: 'Не удалось открыть базу данных',
    retry: 'Повторить',
  },
  home: {
    title: 'Developer Quiz',
    startQuiz: 'Начать квиз',
    allDone: 'Все грейды пройдены. Отличная работа!',
    locked: 'Закрыто',
    solvedOf: 'Решено {solved} из {total}',
  },
  grades: {
    junior: 'Junior',
    middle: 'Middle',
    senior: 'Senior',
  },
  quiz: {
    progress: 'Вопрос {current} из {total}',
    correct: 'Верно',
    wrong: 'Неверно',
    explanation: 'Пояснение',
    next: 'Дальше',
    finish: 'Показать результат',
  },
  result: {
    title: 'Квиз завершён',
    score: 'Правильных ответов: {correct} из {total}',
    newQuiz: 'Новый квиз',
    home: 'На главную',
  },
  settings: {
    title: 'Настройки',
    stub: 'Выбор тем, темы оформления и языка появятся в следующих версиях.',
  },
} as const;
