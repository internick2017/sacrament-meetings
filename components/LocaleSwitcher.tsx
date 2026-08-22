'use client';

import { useRef } from 'react';
import { LOCALES, LOCALE_LABELS } from '@/lib/i18n/config';
import { setLocaleAction } from '@/lib/i18n/actions';
import { useLocale, useT } from '@/lib/i18n/client';

// A <select> inside a form that posts to the setLocaleAction Server Action.
// Changing the option submits the form, so it works without JavaScript too:
// with JS off the visitor still gets the native submit on the fallback button.
export default function LocaleSwitcher() {
  const locale = useLocale();
  const t = useT();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={setLocaleAction} className="flex items-center gap-2">
      <label htmlFor="locale" className="text-sm text-slate-300">
        {t('locale.label')}
      </label>
      <select
        id="locale"
        name="locale"
        // The select is uncontrolled, so React keeps the existing DOM node on
        // re-render and would leave the old option showing after the language
        // changes. Keying by locale remounts it so it displays the new value.
        key={locale}
        defaultValue={locale}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded border border-slate-600 bg-slate-700 px-2 py-1 text-sm text-white"
      >
        {LOCALES.map((option) => (
          <option key={option} value={option}>
            {LOCALE_LABELS[option]}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="rounded border border-slate-600 px-2 py-1 text-sm">
          OK
        </button>
      </noscript>
    </form>
  );
}
