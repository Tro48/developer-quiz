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

function schemaIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => `схема: ${issue.path.join('.')} — ${issue.message}`);
}

function sectionIssues(sections: DocSection[]): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const section of sections) {
    if (ids.has(section.id)) issues.push(`дубликат id: ${section.id}`);
    ids.add(section.id);
    if (!isCoreTopic(section.topic)) issues.push(`тема не в ядре: ${section.topic} (${section.id})`);
    if (!section.url.startsWith('https://developer.mozilla.org/')) {
      issues.push(`не MDN-ссылка: ${section.url}`);
    }
  }
  return issues;
}

export function validateDocMap(sections: unknown): string[] {
  const parsed = docMapSchema.safeParse(sections);
  if (!parsed.success) return schemaIssues(parsed.error);
  return sectionIssues(parsed.data);
}

export async function loadDocMaps(dir: string = paths.docMap): Promise<DocSection[]> {
  const files = (await readdir(dir)).filter((file) => file.endsWith('.json')).sort();
  const sections: DocSection[] = [];
  const idSource = new Map<string, string>();

  for (const file of files) {
    const filePath = path.join(dir, file);
    let raw: unknown;
    try {
      raw = JSON.parse(await readFile(filePath, 'utf8'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Карта ${filePath} не читается: ${message}`);
    }

    const parsed = docMapSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Карта ${filePath} невалидна:\n${schemaIssues(parsed.error).join('\n')}`);
    }

    const issues = sectionIssues(parsed.data);
    if (issues.length > 0) throw new Error(`Карта ${filePath} невалидна:\n${issues.join('\n')}`);

    for (const section of parsed.data) {
      const previous = idSource.get(section.id);
      if (previous !== undefined) {
        throw new Error(`Карта ${filePath} невалидна: id ${section.id} уже определён в ${previous}`);
      }
      idSource.set(section.id, filePath);
      sections.push(section);
    }
  }
  return sections;
}
