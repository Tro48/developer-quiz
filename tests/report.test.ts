import { describe, expect, it } from 'vitest';
import { buildReport } from '../tools/report';

describe('buildReport', () => {
  it('считает статусы, темы и грейды', () => {
    const report = buildReport([
      { status: 'verified', topic: 'javascript', grade: 'junior' },
      { status: 'verified', topic: 'javascript', grade: 'junior' },
      { status: 'rejected', topic: 'javascript', grade: 'middle' },
      { status: 'parsed', topic: 'css' },
    ]);

    expect(report).toContain('Всего записей: 4');
    expect(report).toContain('- verified: 2');
    expect(report).toContain('- rejected: 1');
    expect(report).toContain('- javascript: 2 / 3');
    expect(report).toContain('- css: 0 / 1');
    expect(report).toContain('## По грейдам (verified / всего)');
    expect(report).toContain('- junior: 2 / 2');
    expect(report).toContain('- не задан: 0 / 1');
  });
});
