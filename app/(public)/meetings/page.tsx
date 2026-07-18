import MeetingCard from '@/components/MeetingCard';
import MeetingSearch from '@/components/MeetingSearch';
import Pagination from '@/components/Pagination';
import { getMeetings, countMeetings, PAGE_SIZE } from '@/lib/meetings-db';
import { t } from '@/lib/i18n/en';

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; page?: string }>;
}) {
  // In Next.js 16 searchParams is async: it must be awaited before use.
  const { query = '', page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);

  // Fetch the current page of results and the total count in parallel.
  const [meetings, total] = await Promise.all([
    getMeetings({ query, page: currentPage }),
    countMeetings({ query }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t('list.title')}</h1>

      <MeetingSearch />

      {meetings.length === 0 ? (
        <p className="text-slate-500">{t('list.empty')}</p>
      ) : (
        <ul className="space-y-4">
          {meetings.map((meeting) => (
            <MeetingCard key={meeting.id} meeting={meeting} />
          ))}
        </ul>
      )}

      <Pagination totalPages={totalPages} />
    </div>
  );
}
