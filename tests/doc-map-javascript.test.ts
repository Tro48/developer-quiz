import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateDocMap } from '../tools/docmap';
import { paths } from '../tools/paths';

const raw = JSON.parse(
  readFileSync(path.join(paths.root, 'content/doc-map/javascript.json'), 'utf8'),
) as Array<{ topic: string; url: string; grade: string }>;

describe('карта JavaScript', () => {
  it('валидна и достаточно полна', () => {
    expect(validateDocMap(raw)).toEqual([]);
    // Гранулярность карты — страница оглавления: у глобальных объектов учтён сам объект,
    // без страниц методов (`Array.prototype.map`, `Promise.all` и т. п.).
    expect(raw.length).toBeGreaterThanOrEqual(240);
    expect(raw.length).toBeLessThanOrEqual(320);
    expect(raw.every((section) => section.topic === 'javascript')).toBe(true);
    expect(new Set(raw.map((section) => section.url)).size).toBe(raw.length);
  });

  it('покрывает все три грейда', () => {
    for (const grade of ['junior', 'middle', 'senior']) {
      expect(raw.filter((section) => section.grade === grade).length).toBeGreaterThanOrEqual(10);
    }
  });
});
