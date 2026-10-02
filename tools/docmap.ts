import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { paths } from './paths';
import { isCoreTopic } from './taxonomy';
import { gradeSchema } from './types';

export const docSectionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  topic: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  grade: gradeSchema,
});
export type DocSection = z.infer<typeof docSectionSchema>;

export const docMapSchema = z.array(docSectionSchema);

export function validateDocMap(sections: unknown): string[] {
  const issues: string[] = [];
  const parsed = docMapSchema.safeParse(sections);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push(`схема: ${issue.path.join('.')} — ${issue.message}`);
    }
    return issues;
  }

  const ids = new Set<string>();
  for (const section of parsed.data) {
    if (ids.has(section.id)) issues.push(`дубликат id: ${section.id}`);
    ids.add(section.id);
    if (!isCoreTopic(section.topic)) issues.push(`тема не в ядре: ${section.topic} (${section.id})`);
    if (!section.url.startsWith('https://developer.mozilla.org/')) {
      issues.push(`не MDN-ссылка: ${section.url}`);
    }
  }
  return issues;
}

export async function loadDocMaps(dir: string = paths.docMap): Promise<DocSection[]> {
  const files = (await readdir(dir)).filter((file) => file.endsWith('.json')).sort();
  const sections: DocSection[] = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const raw: unknown = JSON.parse(await readFile(filePath, 'utf8'));
    const issues = validateDocMap(raw);
    if (issues.length > 0) throw new Error(`Карта ${filePath} невалидна:\n${issues.join('\n')}`);
    sections.push(...(raw as DocSection[]));
  }
  return sections;
}
