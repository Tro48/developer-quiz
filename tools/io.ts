import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Метка батча в UTC без спецсимволов: 20261002-153000.
export function batchStamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
  );
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

export async function readJson<T>(filePath: string): Promise<T | null> {
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
  return JSON.parse(raw) as T;
}

// Атомарная запись: временный файл + переименование.
export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, JSON.stringify(value, null, 2), 'utf8');
  await rename(tempPath, filePath);
}

// В пределах одной секунды метка может совпасть: добавляем числовой суффикс.
export async function uniqueBatchId(kind: string, date: Date, batchesDir: string): Promise<string> {
  const base = `${kind}-${batchStamp(date)}`;
  const dir = path.join(batchesDir, kind);

  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const inputExists = await fileExists(path.join(dir, `${candidate}.input.json`));
    const outputExists = await fileExists(path.join(dir, `${candidate}.output.json`));
    if (!inputExists && !outputExists) return candidate;
  }

  throw new Error(`Не удалось подобрать уникальный id батча: ${base}`);
}

type BatchFile = {
  batchId?: unknown;
  questions?: Array<{ id?: unknown }>;
  results?: Array<{ id?: unknown }>;
  verdicts?: Array<{ id?: unknown }>;
};

// Собирает id вопросов, уже встречавшихся в файлах батчей указанного вида.
export async function idsInBatches(kind: string, batchesDir: string): Promise<Set<string>> {
  const dir = path.join(batchesDir, kind);
  let files: string[] = [];
  try {
    files = await readdir(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Set();
    throw error;
  }

  const ids = new Set<string>();
  for (const file of files) {
    if (!file.endsWith('.input.json') && !file.endsWith('.output.json')) continue;
    const content = await readJson<BatchFile>(path.join(dir, file));
    if (!content) continue;
    for (const list of [content.questions, content.results, content.verdicts]) {
      for (const item of list ?? []) {
        if (typeof item?.id === 'string') ids.add(item.id);
      }
    }
  }
  return ids;
}
