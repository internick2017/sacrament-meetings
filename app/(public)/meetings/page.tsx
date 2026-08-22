import Link from 'next/link';
import MeetingCard from '@/components/MeetingCard';
import MeetingSearch from '@/components/MeetingSearch';
import Pagination from '@/components/Pagination';
import { getMeetings, countMeetings, PAGE_SIZE } from '@/lib/meetings-db';
import { auth } from '@/lib/auth';
import { getT } from '@/lib/i18n/server';

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; page?: string }>;
}) {
  // In Next.js 16 searchParams is async: it must be awaited before use.
  const { query = '', page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);

  // Fetch the current page of results, the total count, and the session in
  // parallel.
  const t = await getT();
  const [meetings, total, session] = await Promise.all([
    getMeetings({ query, page: currentPage }),
    countMeetings({ query }),
    auth(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isAdmin = !!session;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('list.title')}</h1>
        {isAdmin ? (
          <Link
            href="/meetings/new"
            className="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            {t('list.new')}
          </Link>
        ) : null}
      </div>

      <MeetingSearch />

      {meetings.length === 0 ? (
        <p className="text-slate-500">{t('list.empty')}</p>
      ) : (
        <ul className="space-y-4">
          {meetings.map((meeting) => (
            <MeetingCard key={meeting.id} meeting={meeting} isAdmin={isAdmin} />
          ))}
        </ul>
      )}

      <Pagination totalPages={totalPages} />
    </div>
  );
}
