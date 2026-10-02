import { ru } from './ru';

export type Dict = { [key: string]: string | Dict };

type Leaves<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Leaves<T[K]>}`;
}[keyof T & string];

export type TranslationKey = Leaves<typeof ru>;
export type TranslationParams = Record<string, string | number>;

export function translate(dict: Dict, key: string, params?: TranslationParams): string {
  const value = key
    .split('.')
    .reduce<string | Dict | undefined>(
      (acc, part) => (typeof acc === 'object' ? acc[part] : undefined),
      dict
    );

  if (typeof value !== 'string') {
    return key;
  }
  if (!params) {
    return value;
  }
  return value.replace(/\{(\w+)\}/g, (match, name: string) =>
    params[name] !== undefined ? String(params[name]) : match
  );
}
