'use client';

import { useActionState } from 'react';
import { addCallingAction, type CallingFormState } from '@/lib/callings-actions';
import { useT } from '@/lib/i18n/client';
import { ORGANIZATION_KEYS } from '@/lib/types';
import type { DictionaryKey } from '@/lib/i18n';

const INPUT = 'w-full rounded border border-slate-300 px-3 py-2';

export default function CallingForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState<CallingFormState, FormData>(
    addCallingAction,
    {}
  );

  // Same helper as UnitForm.tsx: the error paragraph is always rendered (empty
  // when valid) so its id is a stable aria-describedby target and screen
  // readers announce it via aria-live when it fills.
  function fieldError(name: string) {
    return (
      <p id={`${name}-error`} aria-live="polite" className="min-h-5 text-sm text-red-600">
        {state.errors?.[name]?.[0]}
      </p>
    );
  }

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {state.message && (
        <p role="alert" aria-live="polite" className="rounded bg-slate-100 px-3 py-2 text-sm">
          {state.message}
        </p>
      )}

      <label className="block space-y-1">
        <span className="font-semibold">{t('callings.organization')}</span>
        <select
          name="organizationKey"
          defaultValue={ORGANIZATION_KEYS[0]}
          aria-describedby="organizationKey-error"
          className={INPUT}
        >
          {ORGANIZATION_KEYS.map((key) => (
            <option key={key} value={key}>
              {t(`organization.${key}` as DictionaryKey)}
            </option>
          ))}
        </select>
        {fieldError('organizationKey')}
      </label>

      <label className="block space-y-1">
        <span className="font-semibold">{t('callings.person')}</span>
        <input
          type="text"
          name="personName"
          aria-describedby="personName-error"
          className={INPUT}
        />
        {fieldError('personName')}
      </label>

      <label className="block space-y-1">
        <span className="font-semibold">{t('callings.position')}</span>
        <input type="text" name="title" aria-describedby="title-error" className={INPUT} />
        {fieldError('title')}
      </label>

      <label className="block space-y-1">
        <span className="font-semibold">{t('callings.order')}</span>
        <input
          type="number"
          name="displayOrder"
          min="0"
          defaultValue="0"
          aria-describedby="displayOrder-error"
          className={INPUT}
        />
        {fieldError('displayOrder')}
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-slate-800 px-5 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {t('callings.add')}
      </button>
    </form>
  );
}
