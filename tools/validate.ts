import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { paths } from './paths';
import { CORE_TOPIC_SLUGS, isKnownTopic } from './taxonomy';
import { bankQuestionSchema } from './types';

export type ValidationIssue = {
  id?: string;
  message: string;
};

function normalizeOption(option: string): string {
  return option.trim().toLowerCase().replace(/\s+/g, ' ');
}

type ValidateOptions = {
  // Если задан — тема обязана входить в список; иначе достаточно известной.
  allowedTopics?: readonly string[];
};

// Общие проверки: схема, известность темы, уникальность id, различимость вариантов.
function validateQuestions(questions: unknown[], opts: ValidateOptions = {}): ValidationIssue[] {
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

    if (!isKnownTopic(parsed.data.topic)) {
      issues.push({ id: parsed.data.id, message: `неизвестная тема: ${parsed.data.topic}` });
    } else if (opts.allowedTopics && !opts.allowedTopics.includes(parsed.data.topic)) {
      issues.push({
        id: parsed.data.id,
        message: `тема «${parsed.data.topic}» не входит в ядро банка`,
      });
    }

    if (!parsed.data.id.startsWith(`${parsed.data.topic}-`)) {
      issues.push({ id: parsed.data.id, message: 'id не соответствует теме' });
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

// Банк на старте принимает только темы ядра.
export function validateBankQuestions(questions: unknown[]): ValidationIssue[] {
  return validateQuestions(questions, { allowedTopics: CORE_TOPIC_SLUGS });
}

// В рабочей базе проверяем все записи с сырым статусом verified: невалидные
// по схеме не должны молча выпадать из проверки. Тема — любая известная.
export function validateVerified(questions: unknown[]): ValidationIssue[] {
  const verified = questions.filter(
    (question) =>
      typeof question === 'object' &&
      question !== null &&
      (question as { status?: unknown }).status === 'verified',
  );
  return validateQuestions(verified);
}

// Чтение массива записей: ENOENT — это пустая база, остальные проблемы (права,
// битый JSON, не массив) обязаны стать issue, чтобы гейт не зеленел ложно.
export async function readQuestionsFile(
  filePath: string,
  opts: { missingIsError?: boolean } = {},
): Promise<{ questions: unknown[]; issues: ValidationIssue[] }> {
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      if (opts.missingIsError) {
        return { questions: [], issues: [{ message: `файл не найден: ${filePath}` }] };
      }
      return { questions: [], issues: [] };
    }
    return {
      questions: [],
      issues: [{ message: `не удалось прочитать ${filePath}: ${(error as Error).message}` }],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      questions: [],
      issues: [{ message: `не удалось разобрать JSON ${filePath}: ${(error as Error).message}` }],
    };
  }

  if (!Array.isArray(parsed)) {
    return { questions: [], issues: [{ message: `${filePath}: ожидался массив записей` }] };
  }
  return { questions: parsed, issues: [] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const store = await readQuestionsFile(path.join(paths.generated, 'questions.json'));
  const bank = await readQuestionsFile(path.join(paths.bank, 'questions.json'));
  const issues = [
    ...store.issues,
    ...bank.issues,
    ...validateVerified(store.questions),
    ...validateBankQuestions(bank.questions),
  ];

  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(`${issue.id ?? '<без id>'}: ${issue.message}`);
    }
    process.exitCode = 1;
  } else {
    console.log('Проверка пройдена');
  }
}
