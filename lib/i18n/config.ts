// Supported UI languages. `en` is the source of truth for dictionary keys.
export const LOCALES = ['en', 'es', 'pt'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

// Cookie that remembers the visitor's choice. Read on the server (layout,
// server components, server actions) and written by the locale switcher.
export const LOCALE_COOKIE = 'locale';

// Human label for each option in the language switcher, always written in its
// own language so a visitor recognises it whatever the current UI language is.
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
};

// BCP 47 tags used for Intl date formatting.
export const DATE_LOCALES: Record<Locale, string> = {
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-BR',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
