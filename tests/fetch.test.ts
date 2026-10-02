import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { fetchSources } from '../tools/fetch-sources';

describe('fetchSources', () => {
  it('скачивает файлы один раз и использует кэш при повторе', async () => {
    const rawDir = await mkdtemp(path.join(tmpdir(), 'dq-raw-'));
    const fetchImpl = vi.fn(async () => new Response('контент', { status: 200 })) as unknown as typeof fetch;

    const first = await fetchSources({ fetchImpl, rawDir });
    const second = await fetchSources({ fetchImpl, rawDir });

    expect(first.length).toBeGreaterThan(0);
    expect(second).toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(first.length);
  });

  it('падает с понятной ошибкой при неудачном ответе', async () => {
    const rawDir = await mkdtemp(path.join(tmpdir(), 'dq-raw-'));
    const fetchImpl = vi.fn(async () => new Response('нет', { status: 404 })) as unknown as typeof fetch;

    await expect(fetchSources({ fetchImpl, rawDir })).rejects.toThrow(/Не скачалось/);
  });
});
