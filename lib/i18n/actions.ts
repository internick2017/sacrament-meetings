'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from './config';

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

// Called by the language switcher. Stores the choice in a cookie and
// revalidates every route so already-rendered pages come back translated.
export async function setLocaleAction(formData: FormData): Promise<void> {
  const requested = formData.get('locale');
  const locale = isLocale(requested) ? requested : DEFAULT_LOCALE;

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: ONE_YEAR_IN_SECONDS,
    sameSite: 'lax',
  });

  revalidatePath('/', 'layout');
}
