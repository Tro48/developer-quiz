import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { paths } from './paths';
import { bankQuestionSchema, generatedQuestionSchema } from './types';

export type ValidationIssue = {
  id?: string;
  message: string;
};

function normalizeOption(option: string): string {
  return option.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Проверки финального банка: схема, уникальность id, различимость вариантов.
export function validateBankQuestions(questions: unknown[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();

  questions.forEach((question, index) => {
    const parsed = bankQuestionSchema.safeParse(question);
    if (!parsed.success) {
      const id = (question as { id?: string } | null)?.id;
      const details = parsed.error.issues.map((issue) => issue.message).join('; ');
      issues.push({ id, message: `[${index}] не проходит схему банка: ${details}` });
      return;
    }

    if (seen.has(parsed.data.id)) {
      issues.push({ id: parsed.data.id, message: 'дубликат id' });
    }
    seen.add(parsed.data.id);

    const normalized = parsed.data.options.map(normalizeOption);
    if (new Set(normalized).size !== normalized.length) {
      issues.push({ id: parsed.data.id, message: 'варианты ответа повторяются' });
    }
  });

  return issues;
}

// В рабочей базе проверяем только записи со статусом verified.
export function validateVerified(questions: unknown[]): ValidationIssue[] {
  const verified: unknown[] = [];
  for (const question of questions) {
    const parsed = generatedQuestionSchema.safeParse(question);
    if (parsed.success && parsed.data.status === 'verified') verified.push(parsed.data);
  }
  return validateBankQuestions(verified);
}

async function readJsonArray(filePath: string): Promise<unknown[]> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as unknown[];
  } catch {
    return [];
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const store = await readJsonArray(path.join(paths.generated, 'questions.json'));
  const bank = await readJsonArray(path.join(paths.bank, 'questions.json'));
  const issues = [...validateVerified(store), ...validateBankQuestions(bank)];

  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(`${issue.id ?? '<без id>'}: ${issue.message}`);
    }
    process.exitCode = 1;
  } else {
    console.log('Проверка пройдена');
  }
}
