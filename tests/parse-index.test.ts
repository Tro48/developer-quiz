import { cp, mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseAll } from '../tools/parse/index';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

describe('parseAll', () => {
  it('читает оба источника, классифицирует и пишет all.json', async () => {
    const rawDir = await mkdtemp(path.join(tmpdir(), 'dq-raw-'));
    const parsedPath = path.join(await mkdtemp(path.join(tmpdir(), 'dq-parsed-')), 'all.json');

    await mkdir(path.join(rawDir, 'yauhenkavalchuk'), { recursive: true });
    await mkdir(path.join(rawDir, 'hexlet'), { recursive: true });
    await cp(path.join(fixturesDir, 'yauhenkavalchuk-js.md'), path.join(rawDir, 'yauhenkavalchuk/js.md'));
    await cp(path.join(fixturesDir, 'hexlet-frontend.md'), path.join(rawDir, 'hexlet/frontend.md'));

    const parsed = await parseAll({ rawDir, parsedPath });

    expect(parsed).toHaveLength(6);
    expect(new Set(parsed.map((q) => q.id)).size).toBe(6);
    expect(parsed.some((q) => q.topic === 'javascript')).toBe(true);

    // Повторный запуск даёт тот же результат — парсинг идемпотентен.
    const again = await parseAll({ rawDir, parsedPath });
    expect(again.map((q) => q.id)).toEqual(parsed.map((q) => q.id));

    const fromDisk = JSON.parse(await readFile(parsedPath, 'utf8'));
    expect(fromDisk).toHaveLength(6);
  });

  it('не падает, если raw пуст', async () => {
    const rawDir = await mkdtemp(path.join(tmpdir(), 'dq-raw-'));
    const parsedPath = path.join(await mkdtemp(path.join(tmpdir(), 'dq-parsed-')), 'all.json');
    expect(await parseAll({ rawDir, parsedPath })).toEqual([]);
  });
});
