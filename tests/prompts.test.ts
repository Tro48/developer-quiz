import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const toolsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'tools');
const read = (name: string) => readFileSync(path.join(toolsDir, 'prompts', name), 'utf8');

describe('промпты агента', () => {
  it('генерация требует документацию, 4 варианта и обработку пропусков', () => {
    const prompt = read('generate.md');
    expect(prompt).toContain('docsRefs');
    expect(prompt).toContain('4 различных варианта');
    expect(prompt).toContain('skipped');
    expect(prompt).toContain('переформулируй');
  });

  it('верификация требует независимой проверки и причины отказа', () => {
    const prompt = read('verify.md');
    expect(prompt).toContain('docsRefs');
    expect(prompt).toContain('rejected');
    expect(prompt).toContain('reason');
  });
});
