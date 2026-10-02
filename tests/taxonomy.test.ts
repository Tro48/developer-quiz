import { describe, expect, it } from 'vitest';
import {
  CORE_TOPIC_SLUGS,
  TOPICS,
  TOPIC_SLUGS,
  isCoreTopic,
  isKnownTopic,
  topicTitle,
} from '../tools/taxonomy';

describe('справочник тем', () => {
  it('содержит уникальные слаги', () => {
    expect(new Set(TOPIC_SLUGS).size).toBe(TOPIC_SLUGS.length);
  });

  it('у ядра есть положительные цели, у резерва целей нет', () => {
    for (const topic of TOPICS) {
      if (topic.status === 'core') {
        expect(topic.target).toBeGreaterThan(0);
      } else {
        expect(topic.target).toBeUndefined();
      }
    }
  });

  it('ядро — ровно пять утверждённых технологий', () => {
    expect([...CORE_TOPIC_SLUGS].sort()).toEqual(['css', 'html', 'javascript', 'react', 'typescript']);
  });

  it('знает ядро и резерв и различает их', () => {
    expect(isKnownTopic('javascript')).toBe(true);
    expect(isCoreTopic('javascript')).toBe(true);
    expect(isKnownTopic('algorithms')).toBe(true);
    expect(isCoreTopic('algorithms')).toBe(false);
    expect(isKnownTopic('кулинария')).toBe(false);
  });

  it('даёт человекочитаемое название', () => {
    expect(topicTitle('javascript')).toBe('JavaScript');
    expect(topicTitle('нет-такой')).toBe('нет-такой');
  });
});
