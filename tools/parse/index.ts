import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { classifyAll } from '../classify';
import { paths } from '../paths';
import { sources } from '../sources';
import type { SourceConfig, SourceFile } from '../sources';
import type { ParsedQuestion } from '../types';
import { parseHexlet } from './hexlet';
import { parseYauhenkavalchuk } from './yauhenkavalchuk';

export type ParseOptions = {
  rawDir?: string;
  parsedPath?: string;
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

// Читает все скачанные файлы, классифицирует, схлопывает дубли и сохраняет all.json.
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
      } catch {
        continue;
      }
      questions.push(...parseSourceFile(source, file, markdown));
    }
  }

  const unique = classifyAll(questions);
  await mkdir(path.dirname(parsedPath), { recursive: true });
  await writeFile(parsedPath, JSON.stringify(unique, null, 2), 'utf8');
  return unique;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const parsed = await parseAll();
  console.log(`Разобрано вопросов: ${parsed.length}`);
}
