import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';

import { ru } from './ru';
import { translate, type TranslationKey, type TranslationParams } from './translate';

export type Language = 'ru';
export type Translate = (key: TranslationKey, params?: TranslationParams) => string;

type I18nValue = { language: Language; t: Translate };

const I18nContext = createContext<I18nValue>({
  language: 'ru',
  t: (key, params) => translate(ru, key, params),
});

export function isLanguage(value: string): value is Language {
  return value === 'ru';
}

type Props = PropsWithChildren<{ language?: Language }>;

export function I18nProvider({ language = 'ru', children }: Props) {
  const value = useMemo<I18nValue>(
    () => ({ language, t: (key, params) => translate(ru, key, params) }),
    [language]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nValue {
  return useContext(I18nContext);
}
