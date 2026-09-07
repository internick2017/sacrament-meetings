'use client';

import { useActionState } from 'react';
import { adminRemovePersonAction, type RemovePersonResult } from '@/lib/people-actions';
import { useT } from '@/lib/i18n/client';
import type { OrphanedPerson } from '@/lib/people-db';

// Admin-only list of people who hold no current calling: the orphan a
// deleted calling leaves behind, plus anyone simply released. This is the
// ONLY screen in the app that can reach adminRemovePersonAction — without
// it, an orphaned person is invisible and permanently stuck in the `people`
// table. Rendered only when there is at least one such person (this
// project's convention: no heading over an empty list).
export default function OrphanedPeople({ people }: { people: OrphanedPerson[] }) {
  const t = useT();

  if (people.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-bold">{t('callings.noCurrentCalling')}</h2>
      <p className="max-w-xl text-sm text-slate-600">{t('callings.noCurrentCallingIntro')}</p>
      <ul className="space-y-1">
        {people.map((person) => (
          <OrphanedPersonRow key={person.id} person={person} />
        ))}
      </ul>
    </div>
  );
}

function OrphanedPersonRow({ person }: { person: OrphanedPerson }) {
  const t = useT();
  const [state, formAction, pending] = useActionState<RemovePersonResult, FormData>(
    adminRemovePersonAction,
    {
      ok: false,
    }
  );

  return (
    <li className="flex items-center justify-between gap-4 rounded border border-slate-200 px-3 py-2">
      <span>
        {person.fullName} —{' '}
        {t('callings.pastCallingsCount', { count: person.pastCallingsCount })}
      </span>
      <div className="flex items-center gap-2">
        {state.message && (
          <p role="alert" aria-live="polite" className="text-sm text-slate-600">
            {state.message}
          </p>
        )}
        <form
          action={formAction}
          onSubmit={(event) => {
            if (!window.confirm(t('callings.confirmRemovePerson'))) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="personId" value={person.id} />
          <button
            type="submit"
            disabled={pending}
            className="rounded border border-red-300 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {t('callings.removePerson')}
          </button>
        </form>
      </div>
    </li>
  );
}
