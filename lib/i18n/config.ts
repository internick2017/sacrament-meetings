// Supported UI languages. `en` is the source of truth for dictionary keys:
// `es.ts` and `pt.ts` are typed against it, so a missing key is a compile
// error. That is a build-time concern and says nothing about which language a
// visitor sees.
export const LOCALES = ['en', 'es', 'pt'] as const;

export type Locale = (typeof LOCALES)[number];

// What a visitor sees before choosing anything. Portuguese, because this unit
// is in Francisco Beltrão, Paraná: for almost everyone arriving here it is the
// only language they read, so English as the default would have been a
// leftover from the course project, not a decision. Spanish and English stay
// one click away in the switcher.
export const DEFAULT_LOCALE: Locale = 'pt';

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
