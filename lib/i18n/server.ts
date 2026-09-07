import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './config';
import { createTranslator, getDictionary, type Translator } from './index';

// Reads the language the visitor picked. Anything unexpected in the cookie
// (hand-edited, stale, missing) falls back to DEFAULT_LOCALE instead of
// crashing.
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

// Translator for Server Components and Server Actions.
export async function getT(): Promise<Translator> {
  const locale = await getLocale();
  return createTranslator(getDictionary(locale));
}
