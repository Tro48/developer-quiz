import {
  emitGenerationBatch,
  emitVerificationBatch,
  mergeGenerationBatch,
  mergeVerificationBatch,
} from './batch';
import { docgenStatus, emitDocgenBatch, mergeDocgenBatch } from './docgen';
import { emitTopicfixBatch, mergeTopicfixBatch } from './topicfix';
import { GRADES } from './types';

type Grade = (typeof GRADES)[number];

function argValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function sizeArg(args: string[], fallback = 10): number {
  const index = args.indexOf('--size');
  if (index === -1) return fallback;
  const value = Number(args[index + 1]);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error('--size должен быть положительным целым числом');
  }
  return value;
}

function gradeArg(args: string[]): Grade | undefined {
  const index = args.indexOf('--grade');
  if (index === -1) return undefined;
  const raw = args[index + 1];
  const grade = GRADES.find((candidate) => candidate === raw);
  if (!grade) {
    throw new Error('--grade должен быть одним из: junior, middle, senior');
  }
  return grade;
}

const args = process.argv.slice(2);
const command = args.shift() ?? '';

const commands: Record<string, () => Promise<void>> = {
  'generate-next': async () => {
    const result = await emitGenerationBatch({ size: sizeArg(args) });
    console.log(result ? `Батч создан: ${result.inputPath}` : 'Нет вопросов для генерации');
  },
  'generate-merge': async () => {
    const file = args[0];
    if (!file) throw new Error('Укажи путь к output-файлу батча');
    const result = await mergeGenerationBatch(file);
    console.log(`Смержено: ${result.updated}, отклонено при генерации: ${result.rejected}`);
  },
  'verify-next': async () => {
    const result = await emitVerificationBatch({ size: sizeArg(args) });
    console.log(result ? `Батч создан: ${result.inputPath}` : 'Нет вопросов для верификации');
  },
  'verify-merge': async () => {
    const file = args[0];
    if (!file) throw new Error('Укажи путь к output-файлу батча');
    const result = await mergeVerificationBatch(file);
    console.log(`Подтверждено: ${result.verified}, отклонено: ${result.rejected}`);
  },
  'docgen-next': async () => {
    const topic = argValue(args, '--topic');
    const result = await emitDocgenBatch({ size: sizeArg(args), topic, grade: gradeArg(args) });
    console.log(result ? `Батч создан: ${result.inputPath}` : 'Нет разделов для генерации');
  },
  'docgen-merge': async () => {
    const file = args[0];
    if (!file) throw new Error('Укажи путь к output-файлу батча');
    const result = await mergeDocgenBatch(file);
    console.log(`Добавлено вопросов: ${result.added}, пропущено: ${result.skipped}`);
  },
  'docgen-status': async () => {
    const topic = argValue(args, '--topic');
    for (const row of await docgenStatus({})) {
      if (topic && row.topic !== topic) continue;
      console.log(
        `${row.topic}: покрыто ${row.covered}/${row.total}, verified ${row.verified}, отказов ${row.rejected}`,
      );
    }
  },
  'topics-next': async () => {
    const result = await emitTopicfixBatch({ size: sizeArg(args, 30) });
    console.log(result ? `Батч создан: ${result.inputPath}` : 'Нет вопросов для назначения тем');
  },
  'topics-merge': async () => {
    const file = args[0];
    if (!file) throw new Error('Укажи путь к output-файлу батча');
    const result = await mergeTopicfixBatch(file);
    console.log(
      `Назначено: ${result.applied}, пропущено: ${result.skipped}, коллизий: ${result.collisions}`,
    );
  },
};

const run = commands[command];
if (!run) {
  throw new Error(`Неизвестная команда: ${command}`);
}
await run();
