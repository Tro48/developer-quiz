import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { paths } from '../tools/paths';

const expectedRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('paths', () => {
  it('строит корень проекта и все data-пути относительно него', () => {
    expect(paths.root).toBe(expectedRoot);
    expect(paths.raw).toBe(path.join(expectedRoot, 'data/raw'));
    expect(paths.parsed).toBe(path.join(expectedRoot, 'data/parsed'));
    expect(paths.generated).toBe(path.join(expectedRoot, 'data/generated'));
    expect(paths.batches).toBe(path.join(expectedRoot, 'data/batches'));
    expect(paths.bank).toBe(path.join(expectedRoot, 'data/bank'));
  });
});
