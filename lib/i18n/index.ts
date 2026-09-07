import { DATE_LOCALES, DEFAULT_LOCALE, type Locale } from './config';
import { en } from './dictionaries/en';
import { es } from './dictionaries/es';
import { pt } from './dictionaries/pt';
import type { Dictionary, DictionaryKey } from './dictionaries/en';

export type { Dictionary, DictionaryKey };
export * from './config';

const DICTIONARIES: Record<Locale, Dictionary> = { en, es, pt };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

// A translator is just a lookup plus optional {placeholder} substitution, so
// the same function shape works in Server and Client Components alike.
export type Translator = (
  key: DictionaryKey,
  vars?: Record<string, string | number>
) => string;

export function createTranslator(dictionary: Dictionary): Translator {
  return (key, vars) => {
    const text = dictionary[key] ?? en[key] ?? key;
    if (!vars) {
      return text;
    }
    return Object.entries(vars).reduce(
      (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
      text
    );
  };
}

// Every meeting date is stored as a plain 'YYYY-MM-DD' string. Appending the
// midnight time keeps it from being shifted a day by the runtime timezone.
export function formatMeetingDate(date: string, locale: Locale): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(DATE_LOCALES[locale], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// An activity's timestamp is stored as an absolute instant (ISO 8601 with an
// offset), unlike a meeting's plain date. It is rendered in the congregation's
// own timezone (from `getUnit().timezone`), not the visitor's or the server's,
// so the same activity reads the same way for everyone. An all-day activity
// shows no time, since the stored time-of-day is a placeholder rather than a
// real start time.
export function formatEventDateTime(
  isoString: string,
  allDay: boolean,
  locale: Locale,
  timeZone: string
): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone,
  };
  if (!allDay) {
    options.hour = 'numeric';
    options.minute = '2-digit';
  }
  return new Date(isoString).toLocaleString(DATE_LOCALES[locale], options);
}
