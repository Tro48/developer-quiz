import {
  emitGenerationBatch,
  emitVerificationBatch,
  mergeGenerationBatch,
  mergeVerificationBatch,
} from './batch';

function argValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

const args = process.argv.slice(2);
const command = args.shift() ?? '';
const size = Number(argValue(args, '--size') ?? 10);

const commands: Record<string, () => Promise<void>> = {
  'generate-next': async () => {
    const result = await emitGenerationBatch({ size });
    console.log(result ? `Батч создан: ${result.inputPath}` : 'Нет вопросов для генерации');
  },
  'generate-merge': async () => {
    const file = args[0];
    if (!file) throw new Error('Укажи путь к output-файлу батча');
    const result = await mergeGenerationBatch(file);
    console.log(`Смержено: ${result.updated}, отклонено при генерации: ${result.rejected}`);
  },
  'verify-next': async () => {
    const result = await emitVerificationBatch({ size });
    console.log(result ? `Батч создан: ${result.inputPath}` : 'Нет вопросов для верификации');
  },
  'verify-merge': async () => {
    const file = args[0];
    if (!file) throw new Error('Укажи путь к output-файлу батча');
    const result = await mergeVerificationBatch(file);
    console.log(`Подтверждено: ${result.verified}, отклонено: ${result.rejected}`);
  },
};

const run = commands[command];
if (!run) {
  throw new Error(`Неизвестная команда: ${command}`);
}
await run();
