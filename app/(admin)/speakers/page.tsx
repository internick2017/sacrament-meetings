import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSpeakerAppearances } from '@/lib/meetings-db';
import { getUnit } from '@/lib/unit-db';
import { listMembers } from '@/lib/members-db';
import { getSessionUser } from '@/lib/authz';
import { getT } from '@/lib/i18n/server';
import { summarizeSpeakers } from '@/lib/speakers';
import { todayInTimeZone } from '@/lib/timezone';
import NotAllowed from '@/components/NotAllowed';
import SpeakerTable from '@/components/SpeakerTable';
import RosterForm from '@/components/RosterForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('speakers.title') };
}

export default async function SpeakersPage() {
  const [sessionUser, t] = await Promise.all([getSessionUser(), getT()]);

  // The (admin) layout lets a leader through too. Deciding whom to invite to
  // speak is the bishopric's call, so this page is admin-only, gated before
  // any meeting data is read (same pattern as /users and /unit).
  if (!sessionUser) {
    redirect('/login');
  }
  if (sessionUser.role !== 'admin') {
    return <NotAllowed />;
  }

  const [meetings, unit, members] = await Promise.all([
    getSpeakerAppearances(),
    getUnit(),
    listMembers(),
  ]);
  const today = todayInTimeZone(unit.timezone);
  const { rows, neverSpoke, unmatched } = summarizeSpeakers(meetings, members, today);
  const hasRoster = members.length > 0;

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t('speakers.title')}</h1>
        <p className="max-w-2xl text-slate-600">{t('speakers.intro')}</p>
      </div>

      {hasRoster ? (
        // Collapsed by default: with a full roster this list runs to well over a
        // hundred names and would push the table far down a phone screen.
        <details className="rounded border border-slate-200 p-4">
          <summary className="cursor-pointer">
            <h2 className="inline text-lg font-semibold">
              {t('speakers.neverSpoke.title', { count: neverSpoke.length })}
            </h2>
          </summary>
          {neverSpoke.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">{t('speakers.neverSpoke.none')}</p>
          ) : (
            <ul className="mt-3 columns-1 gap-6 text-sm sm:columns-2 lg:columns-3">
              {neverSpoke.map((member) => (
                <li key={member.id} className="break-inside-avoid py-0.5">{member.fullName}</li>
              ))}
            </ul>
          )}
        </details>
      ) : (
        <p className="max-w-2xl rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t('speakers.roster.empty')}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="text-slate-500">{t('speakers.empty')}</p>
      ) : (
        <SpeakerTable rows={rows} today={today} />
      )}

      {hasRoster && unmatched.length > 0 && (
        <section aria-labelledby="unmatched-heading" className="space-y-2">
          <h2 id="unmatched-heading" className="text-lg font-semibold">
            {t('speakers.unmatched.title', { count: unmatched.length })}
          </h2>
          <p className="max-w-2xl text-sm text-slate-600">{t('speakers.unmatched.note')}</p>
          <ul className="columns-1 gap-6 text-sm sm:columns-2 lg:columns-3">
            {unmatched.map((row) => (
              <li key={row.key} className="break-inside-avoid py-0.5">
                {row.name} <span className="tabular-nums text-slate-500">({row.timesSpoken})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <details open={!hasRoster} className="rounded border border-slate-200 p-4">
        <summary className="cursor-pointer font-semibold">
          {t('speakers.roster.title', { count: members.length })}
        </summary>
        <div className="mt-4">
          <RosterForm names={members.map((member) => member.fullName)} />
        </div>
      </details>
    </section>
  );
}
