'use client';

import { useActionState, useState } from 'react';
import { saveRosterAction, type RosterFormState } from '@/lib/members-actions';
import { useT } from '@/lib/i18n/client';

const initialState: RosterFormState = {};

export default function RosterForm({ names }: { names: string[] }) {
  const t = useT();
  const [state, formAction, isPending] = useActionState(saveRosterAction, initialState);

  // Same remount-by-key pattern as MeetingForm: the uncontrolled textarea only
  // picks up the echoed or freshly saved list after a remount.
  const [formInstance, setFormInstance] = useState(0);
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    setFormInstance((n) => n + 1);
  }

  const text = state.values?.names ?? names.join('\n');
  const error = state.errors?.names?.[0];

  return (
    <form key={formInstance} action={formAction} className="space-y-3">
      {state.message && (
        <p
          role={state.saved ? 'status' : 'alert'}
          aria-live="polite"
          className={
            state.saved
              ? 'rounded bg-green-50 px-3 py-2 text-sm text-green-800'
              : 'rounded bg-red-50 px-3 py-2 text-sm text-red-700'
          }
        >
          {state.message}
        </p>
      )}
      <div>
        <label htmlFor="roster-names" className="mb-1 block text-sm font-semibold">
          {t('speakers.roster.label')}
        </label>
        <textarea
          id="roster-names"
          name="names"
          rows={12}
          defaultValue={text}
          aria-describedby="roster-names-hint names-error"
          className="w-full max-w-2xl rounded border border-slate-300 px-3 py-2 font-mono text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
        <p id="roster-names-hint" className="mt-1 text-xs text-slate-500">{t('speakers.roster.hint')}</p>
        <p id="names-error" aria-live="polite" className="min-h-5 text-sm text-red-600">{error}</p>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {isPending ? t('speakers.roster.saving') : t('speakers.roster.save')}
      </button>
    </form>
  );
}
