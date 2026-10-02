import { z } from 'zod';
import { normalizeQuestionText } from './ids';
import { readJson, writeJson } from './io';
import { paths } from './paths';
import { isKnownTopic } from './taxonomy';

export const topicOverrideSchema = z.object({
  source: z.string().min(1),
  sourceUrl: z.string().url(),
  question: z.string().min(1),
  topic: z.string().min(1),
});
export type TopicOverride = z.infer<typeof topicOverrideSchema>;

export const topicOverridesSchema = z.array(topicOverrideSchema);

export type OverrideSource = { source?: unknown; sourceUrl?: unknown; question?: unknown };

// Ключ одного и того же вопроса из одного источника.
export function contentKey(record: OverrideSource): string | null {
  if (
    typeof record.source !== 'string' ||
    typeof record.sourceUrl !== 'string' ||
    typeof record.question !== 'string'
  ) {
    return null;
  }
  return `${record.source}|${record.sourceUrl}|${normalizeQuestionText(record.question)}`;
}

export function overrideKey(override: TopicOverride): string {
  return `${override.source}|${override.sourceUrl}|${normalizeQuestionText(override.question)}`;
}

export async function loadTopicOverrides(
  filePath: string = paths.topicOverrides,
): Promise<TopicOverride[]> {
  const raw = await readJson<unknown>(filePath);
  if (raw === null) return [];
  const parsed = topicOverridesSchema.safeParse(raw);
  if (!parsed.success) throw new Error(`Файл исключений тем невалиден: ${filePath}`);
  for (const override of parsed.data) {
    if (!isKnownTopic(override.topic)) {
      throw new Error(`Неизвестная тема в исключении: ${override.topic}`);
    }
  }
  return parsed.data;
}

export async function saveTopicOverrides(
  overrides: TopicOverride[],
  filePath: string = paths.topicOverrides,
): Promise<void> {
  await writeJson(filePath, overrides);
}

// Возвращает тему из исключения для записи или null.
export function topicFromOverrides(
  record: OverrideSource,
  overrides: TopicOverride[],
): string | null {
  const key = contentKey(record);
  if (!key) return null;
  return overrides.find((override) => overrideKey(override) === key)?.topic ?? null;
}
