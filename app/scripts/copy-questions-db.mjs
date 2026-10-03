import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, '../../data/bank/questions.db');
const target = resolve(here, '../assets/db/questions-v2.db');

if (!existsSync(source)) {
  console.error('Нет data/bank/questions.db — сначала выполните npm run build в корне репозитория');
  process.exit(1);
}

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log(`questions.db → ${target}`);
