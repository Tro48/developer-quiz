import { describe, expect, it } from 'vitest';
import { TOPIC_RULES } from '../tools/classify';
import { sources } from '../tools/sources';
import { isKnownTopic } from '../tools/taxonomy';

describe('инварианты таксономии', () => {
  it('все подсказки источников — известные темы', () => {
    for (const source of sources) {
      for (const file of source.files) {
        if (file.topicHint) expect(isKnownTopic(file.topicHint)).toBe(true);
      }
    }
  });

  it('все правила классификатора ведут к известным темам', () => {
    for (const [, topic] of TOPIC_RULES) expect(isKnownTopic(topic)).toBe(true);
  });
});
