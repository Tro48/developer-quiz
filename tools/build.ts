import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import Database from 'better-sqlite3';
import { paths } from './paths';
import { bankQuestionSchema, generatedQuestionSchema, type BankQuestion } from './types';
import { readQuestionsFile, validateBankQuestions } from './validate';

export type BuildOptions = {
  questionsPath?: string;
  bankDir?: string;
};

// Атомарная запись: временный файл + переименование.
async function writeAtomic(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, content, 'utf8');
  await rename(tempPath, filePath);
}

export async function buildBank(
  opts: BuildOptions = {},
): Promise<{ total: number; jsonPath: string; dbPath: string }> {
  const questionsPath = opts.questionsPath ?? path.join(paths.generated, 'questions.json');
  const bankDir = opts.bankDir ?? paths.bank;

  const { questions: store, issues: readIssues } = await readQuestionsFile(questionsPath, {
    missingIsError: true,
  });
  const errors: string[] = readIssues.map((issue) => issue.message);

  const verified: BankQuestion[] = [];
  for (const question of store) {
    if (typeof question !== 'object' || question === null) {
      errors.push(`запись не объект: ${String(question)}`);
      continue;
    }
    if ((question as { status?: unknown }).status !== 'verified') continue;

    const parsed = generatedQuestionSchema.safeParse(question);
    if (!parsed.success) {
      const id = (question as { id?: string }).id ?? '<без id>';
      errors.push(`${id}: verified-запись не проходит схему вопроса`);
      continue;
    }
    verified.push(bankQuestionSchema.parse(parsed.data));
  }

  const issues = validateBankQuestions(verified);
  for (const issue of issues) {
    errors.push(`${issue.id ?? '<без id>'}: ${issue.message}`);
  }

  if (errors.length > 0) {
    throw new Error(`Банк не собран, проблем: ${errors.length}\n${errors.join('\n')}`);
  }

  await mkdir(bankDir, { recursive: true });
  const jsonPath = path.join(bankDir, 'questions.json');
  const dbPath = path.join(bankDir, 'questions.db');

  // SQLite собираем во временном файле и подменяем только после успешной вставки.
  const db = new Database(`${dbPath}.tmp`);
  try {
    db.exec(`
      DROP TABLE IF EXISTS questions;
      CREATE TABLE questions (
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL,
        grade TEXT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        options_json TEXT NOT NULL,
        correct_index INTEGER NOT NULL,
        explanation TEXT NOT NULL,
        docs_refs_json TEXT NOT NULL,
        doc_section TEXT,
        source TEXT NOT NULL,
        source_url TEXT NOT NULL
      );
      CREATE INDEX idx_questions_topic_grade ON questions(topic, grade);
    `);

    const insert = db.prepare(`
      INSERT INTO questions (
        id, topic, grade, question, answer, options_json,
        correct_index, explanation, docs_refs_json, doc_section, source, source_url
      ) VALUES (
        @id, @topic, @grade, @question, @answer, @optionsJson,
        @correctIndex, @explanation, @docsRefsJson, @docSection, @source, @sourceUrl
      )
    `);

    const insertAll = db.transaction((items: BankQuestion[]) => {
      for (const item of items) {
        insert.run({
          id: item.id,
          topic: item.topic,
          grade: item.grade,
          question: item.question,
          answer: item.answer,
          optionsJson: JSON.stringify(item.options),
          correctIndex: item.correctIndex,
          explanation: item.explanation,
          docsRefsJson: JSON.stringify(item.docsRefs),
          docSection: item.docSection ?? null,
          source: item.source,
          sourceUrl: item.sourceUrl,
        });
      }
    });

    insertAll(verified);
  } finally {
    db.close();
  }

  await rename(`${dbPath}.tmp`, dbPath);
  await writeAtomic(jsonPath, JSON.stringify(verified, null, 2));

  return { total: verified.length, jsonPath, dbPath };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await buildBank();
  console.log(`В банке вопросов: ${result.total}`);
  console.log(`JSON: ${result.jsonPath}`);
  console.log(`SQLite: ${result.dbPath}`);
}
