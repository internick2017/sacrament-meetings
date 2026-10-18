import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/authz';
import { getT } from '@/lib/i18n/server';
import { listInterviewBoard } from '@/lib/interviews-db';
import { buildBoard, parseBoardFilter } from '@/lib/interviews-board';
import { getUnit } from '@/lib/unit-db';
import NotAllowed from '@/components/NotAllowed';
import InterviewBoard from '@/components/InterviewBoard';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('interviews.title') };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function InterviewsPage({ searchParams }: { searchParams: SearchParams }) {
  const [sessionUser, t, params] = await Promise.all([getSessionUser(), getT(), searchParams]);

  // Checked here too, not only in the layout: the board carries phone
  // numbers, so nothing is read before this passes.
  if (!sessionUser) {
    redirect('/login');
  }
  if (sessionUser.role !== 'admin' && sessionUser.role !== 'secretary') {
    return <NotAllowed />;
  }

  const filter = parseBoardFilter(params.filter);
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = (rawQuery ?? '').trim().slice(0, 100);

  const [rows, unit] = await Promise.all([listInterviewBoard(), getUnit()]);
  const board = buildBoard(rows, filter, query);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{t('interviews.title')}</h1>
          <p className="max-w-2xl text-slate-600">{t('interviews.intro')}</p>
        </div>
        <Link
          href={filter === 'individual' ? '/interviews/schedule?kind=individual' : '/interviews/schedule'}
          className="rounded bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-700"
        >
          {t('interviews.scheduleNew')}
        </Link>
      </div>
      <InterviewBoard board={board} filter={filter} query={query} timeZone={unit.timezone} />
    </section>
  );
}
