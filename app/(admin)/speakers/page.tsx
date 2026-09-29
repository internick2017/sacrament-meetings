import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSpeakerAppearances } from '@/lib/meetings-db';
import { getUnit } from '@/lib/unit-db';
import { getSessionUser } from '@/lib/authz';
import { getT } from '@/lib/i18n/server';
import { summarizeSpeakers } from '@/lib/speakers';
import { todayInTimeZone } from '@/lib/timezone';
import NotAllowed from '@/components/NotAllowed';
import SpeakerTable from '@/components/SpeakerTable';

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

  const [meetings, unit] = await Promise.all([getSpeakerAppearances(), getUnit()]);
  const today = todayInTimeZone(unit.timezone);
  const rows = summarizeSpeakers(meetings, today);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">{t('speakers.title')}</h1>
      <div className="max-w-2xl space-y-1 text-slate-600">
        <p>{t('speakers.intro')}</p>
        <p className="text-sm">{t('speakers.rosterNote')}</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-slate-500">{t('speakers.empty')}</p>
      ) : (
        <SpeakerTable rows={rows} today={today} />
      )}
    </section>
  );
}
