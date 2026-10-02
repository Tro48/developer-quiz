import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import Database from 'better-sqlite3';
import { paths } from './paths';
import { bankQuestionSchema, generatedQuestionSchema, type BankQuestion } from './types';
import { validateBankQuestions } from './validate';

export type BuildOptions = {
  questionsPath?: string;
  bankDir?: string;
};

export async function buildBank(
  opts: BuildOptions = {},
): Promise<{ total: number; jsonPath: string; dbPath: string }> {
  const questionsPath = opts.questionsPath ?? path.join(paths.generated, 'questions.json');
  const bankDir = opts.bankDir ?? paths.bank;

  const store = JSON.parse(await readFile(questionsPath, 'utf8')) as unknown[];
  const verified: BankQuestion[] = [];
  for (const question of store) {
    const parsed = generatedQuestionSchema.safeParse(question);
    if (parsed.success && parsed.data.status === 'verified') {
      verified.push(bankQuestionSchema.parse(parsed.data));
    }
  }

  const issues = validateBankQuestions(verified);
  if (issues.length > 0) {
    const details = issues.map((issue) => `${issue.id ?? '<без id>'}: ${issue.message}`).join('\n');
    throw new Error(`Банк не собран, проблем: ${issues.length}\n${details}`);
  }

  await mkdir(bankDir, { recursive: true });
  const jsonPath = path.join(bankDir, 'questions.json');
  const dbPath = path.join(bankDir, 'questions.db');
  await writeFile(jsonPath, JSON.stringify(verified, null, 2), 'utf8');

  const db = new Database(dbPath);
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
      source TEXT NOT NULL,
      source_url TEXT NOT NULL
    );
    CREATE INDEX idx_questions_topic_grade ON questions(topic, grade);
  `);

  const insert = db.prepare(`
    INSERT INTO questions (
      id, topic, grade, question, answer, options_json,
      correct_index, explanation, docs_refs_json, source, source_url
    ) VALUES (
      @id, @topic, @grade, @question, @answer, @optionsJson,
      @correctIndex, @explanation, @docsRefsJson, @source, @sourceUrl
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
        source: item.source,
        sourceUrl: item.sourceUrl,
      });
    }
  });

  insertAll(verified);
  db.close();

  return { total: verified.length, jsonPath, dbPath };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await buildBank();
  console.log(`В банке вопросов: ${result.total}`);
  console.log(`JSON: ${result.jsonPath}`);
  console.log(`SQLite: ${result.dbPath}`);
}
