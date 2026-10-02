import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { paths } from './paths';
import { sources } from './sources';

export type FetchOptions = {
  fetchImpl?: typeof fetch;
  rawDir?: string;
};

// Идемпотентная загрузка: если файл уже лежит в data/raw, сеть не трогаем.
export async function fetchSources(opts: FetchOptions = {}): Promise<string[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const rawDir = opts.rawDir ?? paths.raw;
  const downloaded: string[] = [];

  for (const source of sources) {
    const dir = path.join(rawDir, source.id);
    await mkdir(dir, { recursive: true });

    for (const file of source.files) {
      const target = path.join(dir, file.name);
      try {
        await readFile(target);
        continue;
      } catch {
        // Файла нет — качаем.
      }

      const response = await fetchImpl(file.url);
      if (!response.ok) {
        throw new Error(`Не скачалось: ${file.url} (HTTP ${response.status})`);
      }
      await writeFile(target, await response.text(), 'utf8');
      downloaded.push(`${source.id}/${file.name}`);
    }
  }

  return downloaded;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const downloaded = await fetchSources();
  console.log(
    downloaded.length ? `Скачано файлов: ${downloaded.length}` : 'Все файлы уже в кэше',
  );
}
