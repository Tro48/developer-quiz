import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  loadTopicOverrides,
  topicFromOverrides,
  type TopicOverride,
} from '../tools/topic-overrides';

async function tempFile(name: string): Promise<string> {
  return path.join(await mkdtemp(path.join(tmpdir(), 'dq-overrides-')), name);
}

const OVERRIDE: TopicOverride = {
  source: 'hexlet',
  sourceUrl: 'https://example.com/frontend',
  question: 'Что такое «блочная модель»?',
  topic: 'html',
};

describe('topic-overrides', () => {
  it('для отсутствующего файла возвращает пустой список', async () => {
    expect(await loadTopicOverrides(await tempFile('missing.json'))).toEqual([]);
  });

  it('падает на неизвестной теме в исключении', async () => {
    const filePath = await tempFile('overrides.json');
    await writeFile(filePath, JSON.stringify([{ ...OVERRIDE, topic: 'python' }]), 'utf8');

    await expect(loadTopicOverrides(filePath)).rejects.toThrow(/Неизвестная тема/);
  });

  it('находит тему по контенту независимо от нормализации текста', () => {
    const record = {
      source: 'hexlet',
      sourceUrl: 'https://example.com/frontend',
      question: '  Что   такое "блочная модель"? ',
    };

    expect(topicFromOverrides(record, [OVERRIDE])).toBe('html');
  });

  it('игнорирует чужой источник и чужой вопрос', () => {
    const record = {
      source: 'hexlet',
      sourceUrl: 'https://example.com/frontend',
      question: OVERRIDE.question,
    };

    expect(topicFromOverrides({ ...record, source: 'yauhenkavalchuk' }, [OVERRIDE])).toBeNull();
    expect(topicFromOverrides({ ...record, sourceUrl: 'https://example.com/js' }, [OVERRIDE])).toBeNull();
    expect(topicFromOverrides({ ...record, question: 'Другой вопрос?' }, [OVERRIDE])).toBeNull();
    expect(topicFromOverrides(record, [])).toBeNull();
  });
});
