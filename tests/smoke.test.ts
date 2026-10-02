import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { paths } from '../tools/paths';

describe('paths', () => {
  it('указывает на корень проекта и существующие пути', () => {
    expect(paths.root).toBe('/Users/andrey/project/developer-quiz');
    expect(existsSync(paths.root)).toBe(true);
  });
});
