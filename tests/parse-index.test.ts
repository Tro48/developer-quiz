import { cp, mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { makeId } from '../tools/ids';
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

    // Добавляем в Hexlet вопрос с текстом, совпадающим с вопросом YauhenKavalchuk:
    // после классификации id совпадут и дубль схлопнется, победит первый источник.
    await writeFile(
      path.join(rawDir, 'hexlet/frontend.md'),
      [
        '',
        '## Middle',
        '',
        '### Основы JavaScript',
        '',
        '- Типы данных в JavaScript?',
        '  <details>',
        '  <summary>Ответ</summary>',
        '',
        '  Любой ответ.',
        '',
        '  </details>',
        '',
      ].join('\n'),
      { flag: 'a' },
    );

    const parsed = await parseAll({ rawDir, parsedPath });

    expect(parsed).toHaveLength(6);
    expect(new Set(parsed.map((q) => q.id)).size).toBe(6);
    expect(parsed.some((q) => q.topic === 'javascript')).toBe(true);
    expect(parsed.every((q) => q.id.startsWith(`${q.topic}-`))).toBe(true);
    expect(parsed.every((q) => /^[a-z0-9-]+-[0-9a-f]{8}$/.test(q.id))).toBe(true);

    const duplicate = parsed.find((q) => q.question === 'Типы данных в JavaScript?');
    expect(duplicate?.source).toBe('yauhenkavalchuk');

    // Повторный запуск даёт тот же результат — парсинг идемпотентен.
    const again = await parseAll({ rawDir, parsedPath });
    expect(again.map((q) => q.id)).toEqual(parsed.map((q) => q.id));

    const fromDisk = JSON.parse(await readFile(parsedPath, 'utf8'));
    expect(fromDisk).toHaveLength(6);
  });

  it('применяет исключение темы и пересчитывает id', async () => {
    const rawDir = await mkdtemp(path.join(tmpdir(), 'dq-raw-'));
    const parsedPath = path.join(await mkdtemp(path.join(tmpdir(), 'dq-parsed-')), 'all.json');
    const overridesPath = path.join(
      await mkdtemp(path.join(tmpdir(), 'dq-overrides-')),
      'topic-overrides.json',
    );

    await mkdir(path.join(rawDir, 'hexlet'), { recursive: true });
    await cp(path.join(fixturesDir, 'hexlet-frontend.md'), path.join(rawDir, 'hexlet/frontend.md'));

    // Вопрос из секции «Общие вопросы (Soft Skills, опыт и мотивация)» по умолчанию
    // классифицируется как soft-skills; исключение переносит его в javascript.
    const question = 'Решал ли какие-то задачки-каты? Codebattle, Codewars, Leetcode?';
    await writeFile(
      overridesPath,
      JSON.stringify([
        {
          source: 'hexlet',
          sourceUrl:
            'https://raw.githubusercontent.com/Hexlet/ru-interview-questions/main/questions/frontend.md',
          question,
          topic: 'javascript',
        },
      ]),
      'utf8',
    );

    const parsed = await parseAll({ rawDir, parsedPath, overridesPath });

    const moved = parsed.find((item) => item.question === question)!;
    expect(moved.topic).toBe('javascript');
    expect(moved.id).toBe(makeId('javascript', question));

    // Остальные вопросы секции исключение не затрагивает.
    const untouched = parsed.find(
      (item) =>
        item.topicHint === 'Общие вопросы (Soft Skills, опыт и мотивация)' &&
        item.question !== question,
    );
    expect(untouched?.topic).toBe('soft-skills');
  });

  it('не падает, если raw пуст', async () => {
    const rawDir = await mkdtemp(path.join(tmpdir(), 'dq-raw-'));
    const parsedPath = path.join(await mkdtemp(path.join(tmpdir(), 'dq-parsed-')), 'all.json');
    expect(await parseAll({ rawDir, parsedPath })).toEqual([]);
  });
});
