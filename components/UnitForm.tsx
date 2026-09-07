'use client';

import { useActionState } from 'react';
import { updateUnitAction, type UnitFormState } from '@/lib/unit-actions';
import { useT } from '@/lib/i18n/client';
import type { Unit } from '@/lib/types';

const INPUT = 'w-full rounded border border-slate-300 px-3 py-2';

export default function UnitForm({ unit }: { unit: Unit }) {
  const t = useT();
  const [state, formAction, pending] = useActionState<UnitFormState, FormData>(
    updateUnitAction,
    {}
  );

  // One helper instead of nine copies of the same markup. The error paragraph is
  // always rendered (empty when valid) so its id is a stable aria-describedby
  // target and screen readers announce it via aria-live when it fills, matching
  // the pattern established in MeetingForm.tsx.
  function fieldError(name: string) {
    return (
      <p id={`${name}-error`} aria-live="polite" className="min-h-5 text-sm text-red-600">
        {state.errors?.[name]?.[0]}
      </p>
    );
  }

  const field = (
    name: keyof Unit,
    labelKey: Parameters<typeof t>[0],
    defaultValue: string
  ) => (
    <label className="block space-y-1">
      <span className="font-semibold">{t(labelKey)}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        aria-describedby={`${name}-error`}
        className={INPUT}
      />
      {fieldError(name)}
    </label>
  );

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {state.message && (
        <p role="alert" aria-live="polite" className="rounded bg-slate-100 px-3 py-2 text-sm">
          {state.message}
        </p>
      )}

      {field('name', 'unit.name', unit.name)}

      <label className="block space-y-1">
        <span className="font-semibold">{t('unit.type')}</span>
        <select
          name="unitType"
          defaultValue={unit.unitType}
          aria-describedby="unitType-error"
          className={INPUT}
        >
          <option value="ward">{t('unit.type.ward')}</option>
          <option value="branch">{t('unit.type.branch')}</option>
        </select>
        {fieldError('unitType')}
      </label>

      {field('stakeName', 'unit.stakeName', unit.stakeName)}
      {field('address', 'unit.address', unit.address)}
      {field('meetingTimes', 'unit.meetingTimes', unit.meetingTimes)}
      {field('timezone', 'unit.timezone', unit.timezone)}
      {field('calendarUrl', 'unit.calendarUrl', unit.calendarUrl)}
      {field('directoryUrl', 'unit.directoryUrl', unit.directoryUrl)}
      {field('contactNote', 'unit.contactNote', unit.contactNote)}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-slate-800 px-5 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {t('unit.save')}
      </button>
    </form>
  );
}
