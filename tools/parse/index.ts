import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { classifyAll } from '../classify';
import { makeId } from '../ids';
import { paths } from '../paths';
import { sources } from '../sources';
import type { SourceConfig, SourceFile } from '../sources';
import { loadTopicOverrides, topicFromOverrides } from '../topic-overrides';
import type { ParsedQuestion } from '../types';
import { parseHexlet } from './hexlet';
import { parseYauhenkavalchuk } from './yauhenkavalchuk';

export type ParseOptions = {
  rawDir?: string;
  parsedPath?: string;
  overridesPath?: string;
};

function parseSourceFile(source: SourceConfig, file: SourceFile, markdown: string): ParsedQuestion[] {
  if (source.id === 'yauhenkavalchuk') {
    return parseYauhenkavalchuk(markdown, {
      source: source.id,
      topicHint: file.topicHint ?? 'other',
    });
  }
  if (source.id === 'hexlet') {
    return parseHexlet(markdown, { source: source.id, sourceUrl: file.url });
  }
  throw new Error(`Нет парсера для источника: ${source.id}`);
}

// Читает все скачанные файлы, классифицирует, применяет исключения тем,
// схлопывает дубли и сохраняет all.json.
export async function parseAll(opts: ParseOptions = {}): Promise<ParsedQuestion[]> {
  const rawDir = opts.rawDir ?? paths.raw;
  const parsedPath = opts.parsedPath ?? path.join(paths.parsed, 'all.json');
  const questions: ParsedQuestion[] = [];

  for (const source of sources) {
    for (const file of source.files) {
      const filePath = path.join(rawDir, source.id, file.name);
      let markdown: string;
      try {
        markdown = await readFile(filePath, 'utf8');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
        throw error;
      }
      questions.push(...parseSourceFile(source, file, markdown));
    }
  }

  const overrides = await loadTopicOverrides(opts.overridesPath);
  const classified = classifyAll(questions);
  const withOverrides = classified.map((question) => {
    const topic = topicFromOverrides(question, overrides);
    if (!topic || topic === question.topic) return question;
    return { ...question, topic, id: makeId(topic, question.question) };
  });
  // После смены темы id пересчитан: схлопываем возможные новые коллизии.
  const unique = [...new Map(withOverrides.map((question) => [question.id, question])).values()];

  await mkdir(path.dirname(parsedPath), { recursive: true });
  await writeFile(parsedPath, JSON.stringify(unique, null, 2), 'utf8');
  return unique;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const parsed = await parseAll();
  console.log(`Разобрано вопросов: ${parsed.length}`);
}
