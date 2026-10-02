import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadDocMaps, validateDocMap } from '../tools/docmap';

const valid = [
  {
    id: 'mdn-js-guide-introduction',
    topic: 'javascript',
    title: 'Introduction',
    url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Introduction',
    grade: 'junior',
  },
];

describe('validateDocMap', () => {
  it('пропускает корректную карту', () => {
    expect(validateDocMap(valid)).toEqual([]);
  });

  it('ловит дубликаты id, не-ядерные темы и не-MDN ссылки', () => {
    const issues = validateDocMap([
      ...valid,
      { ...valid[0] },
      { ...valid[0], id: 'vue-1', topic: 'vue' },
      { ...valid[0], id: 'mdn-js-x', url: 'https://example.com/x' },
    ]);
    expect(issues.some((issue) => issue.includes('дубликат id'))).toBe(true);
    expect(issues.some((issue) => issue.includes('тема не в ядре'))).toBe(true);
    expect(issues.some((issue) => issue.includes('не MDN-ссылка'))).toBe(true);
  });
});

describe('loadDocMaps', () => {
  it('читает карты из каталога и падает на невалидной', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'dq-docmap-'));
    await writeFile(path.join(dir, 'a.json'), JSON.stringify(valid), 'utf8');
    expect(await loadDocMaps(dir)).toHaveLength(1);

    await writeFile(path.join(dir, 'b.json'), JSON.stringify([{ id: 'сломанная' }]), 'utf8');
    await expect(loadDocMaps(dir)).rejects.toThrow(/невалидна/);
  });

  it('оборачивает битый JSON ошибкой с путём файла', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'dq-docmap-'));
    await writeFile(path.join(dir, 'broken.json'), '{ не json', 'utf8');
    await expect(loadDocMaps(dir)).rejects.toThrow(/broken\.json/);
  });

  it('ловит дубликат id между разными файлами карт', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'dq-docmap-'));
    await writeFile(path.join(dir, 'a.json'), JSON.stringify(valid), 'utf8');
    await writeFile(path.join(dir, 'b.json'), JSON.stringify([{ ...valid[0] }]), 'utf8');
    await expect(loadDocMaps(dir)).rejects.toThrow(
      /id mdn-js-guide-introduction уже определён в .*a\.json/,
    );
  });
});
