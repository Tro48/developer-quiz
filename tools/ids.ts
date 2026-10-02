import { createHash } from 'node:crypto';

// Нормализация текста вопроса: регистр, пробелы, кавычки.
// Нужна и для стабильных id, и для дедупликации.
export function normalizeQuestionText(text: string): string {
  return text
    .replace(/[«»“”„‘’"']/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// id = <topic>-<sha1_8> от нормализованного текста: стабилен между запусками,
// дубликаты вопросов внутри темы автоматически схлопываются.
export function makeId(topic: string, question: string): string {
  const hash = createHash('sha1')
    .update(`${topic}|${normalizeQuestionText(question)}`)
    .digest('hex')
    .slice(0, 8);
  return `${topic}-${hash}`;
}
