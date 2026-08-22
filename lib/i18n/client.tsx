'use client';

import { createContext, useContext, useMemo } from 'react';
import { DEFAULT_LOCALE, type Locale } from './config';
import { createTranslator, getDictionary, type Translator } from './index';

interface I18nValue {
  locale: Locale;
  t: Translator;
}

const I18nContext = createContext<I18nValue | null>(null);

// The root layout resolves the locale on the server and hands it down here, so
// Client Components translate without each one reading the cookie itself.
export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nValue>(
    () => ({ locale, t: createTranslator(getDictionary(locale)) }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  // Falling back to English keeps a component usable outside the provider
  // (for example in an isolated test render) instead of throwing.
  return value ?? { locale: DEFAULT_LOCALE, t: createTranslator(getDictionary(DEFAULT_LOCALE)) };
}

export function useT(): Translator {
  return useI18n().t;
}

export function useLocale(): Locale {
  return useI18n().locale;
}
