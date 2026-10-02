import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Централизованные пути к data-каталогам, чтобы скрипты не собирали их вручную.
export const paths = {
  root,
  raw: path.join(root, 'data/raw'),
  parsed: path.join(root, 'data/parsed'),
  generated: path.join(root, 'data/generated'),
  batches: path.join(root, 'data/batches'),
  bank: path.join(root, 'data/bank'),
} as const;
