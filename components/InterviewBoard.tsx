import Link from 'next/link';
import { getLocale, getT } from '@/lib/i18n/server';
import { formatEventDateTime, type Translator } from '@/lib/i18n';
import { BOARD_FILTERS, type Board, type BoardFilter, type BoardMember } from '@/lib/interviews-board';
import { interviewerName, type Interview } from '@/lib/interviews-rules';
import { interviewMessage } from '@/lib/interview-message';
import InterviewRowActions from './InterviewRowActions';

const ACTION_LINK =
  'inline-block rounded bg-slate-800 px-3 py-1 text-sm font-semibold text-white hover:bg-slate-700';
const CELL = 'px-3 py-2 align-top';

function filterHref(filter: BoardFilter, query: string): string {
  const params = new URLSearchParams({ filter });
  if (query) params.set('q', query);
  return `/interviews?${params.toString()}`;
}

// Server-rendered list. Only the row actions are client components. The phone
// reaches them as a prop: it is never put in a link here (the wa.me URL is
// built in the browser), but its digits do travel in the RSC payload, which is
// acceptable because only an admin or secretary can load this page.
export default async function InterviewBoard({
  board,
  filter,
  query,
  timeZone,
}: {
  board: Board;
  filter: BoardFilter;
  query: string;
  timeZone: string;
}) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);

  const when = (iso: string) => formatEventDateTime(iso, false, locale, timeZone);
  const day = (iso: string) => formatEventDateTime(iso, true, locale, timeZone);

  function actions(member: BoardMember, interview: Interview) {
    const message = interviewMessage({
      name: member.fullName,
      kind: interview.kind,
      startsAt: interview.startsAt,
      timeZone,
      mode: interview.mode,
      onlineLink: interview.onlineLink,
      interviewer: interview.interviewer,
    });
    return (
      <InterviewRowActions interviewId={interview.id} memberId={member.id} phone={member.phone} message={message} />
    );
  }

  return (
    <div className="space-y-4">
      <nav aria-label={t('interviews.filter.label')}>
        <ul className="flex flex-wrap gap-2">
          {BOARD_FILTERS.map((key) => {
            const active = key === filter;
            return (
              <li key={key}>
                <Link
                  href={filterHref(key, query)}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-block rounded-full border px-3 py-1 text-sm ${
                    active
                      ? 'border-slate-800 bg-slate-800 font-semibold text-white'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {t(`interviews.filter.${key}`)}{' '}
                  <span className="tabular-nums">({board.counts[key]})</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <form role="search" method="get" action="/interviews" className="flex max-w-md gap-2">
        <input type="hidden" name="filter" value={filter} />
        <label htmlFor="interview-search" className="sr-only">
          {t('interviews.search')}
        </label>
        <input
          id="interview-search"
          type="search"
          name="q"
          defaultValue={query}
          placeholder={t('interviews.search')}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {t('interviews.searchButton')}
        </button>
      </form>

      {filter === 'individual' ? (
        <IndividualTable board={board} query={query} t={t} when={when} actions={actions} />
      ) : board.noHeads ? (
        <p className="max-w-2xl rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">{t('interviews.noHeads')}</p>
      ) : board.families.length === 0 ? (
        <p className="text-slate-500">{query ? t('interviews.noMatch') : t('interviews.emptyFilter')}</p>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">{t('interviews.col.head')}</th>
                <th scope="col" className="px-3 py-2 font-semibold">{t('interviews.col.last')}</th>
                <th scope="col" className="px-3 py-2 font-semibold">{t('interviews.col.status')}</th>
                <th scope="col" className="px-3 py-2 font-semibold">{t('interviews.col.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {board.families.map((family) => (
                <tr key={family.member.id}>
                  <th scope="row" className={`${CELL} font-medium`}>{family.member.fullName}</th>
                  <td className={CELL}>{family.lastInterviewed ? day(family.lastInterviewed) : t('interviews.never')}</td>
                  <td className={CELL}>
                    {t(`interviews.status.${family.status}`)}
                    {family.active && (
                      <span className="block text-xs text-slate-500">
                        {when(family.active.startsAt)}, {interviewerName(family.active.interviewer)}
                      </span>
                    )}
                  </td>
                  <td className={CELL}>
                    {family.active ? (
                      actions(family.member, family.active)
                    ) : (
                      <Link
                        href={`/interviews/schedule?member=${family.member.id}&kind=tithing`}
                        className={ACTION_LINK}
                      >
                        {t('interviews.schedule')}
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function IndividualTable({
  board,
  query,
  t,
  when,
  actions,
}: {
  board: Board;
  query: string;
  t: Translator;
  when: (iso: string) => string;
  actions: (member: BoardMember, interview: Interview) => React.ReactNode;
}) {
  if (board.individual.length === 0) {
    return <p className="text-slate-500">{query ? t('interviews.noMatch') : t('interviews.individualEmpty')}</p>;
  }
  return (
    <div className="overflow-x-auto rounded border border-slate-200">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th scope="col" className="px-3 py-2 font-semibold">{t('interviews.col.member')}</th>
            <th scope="col" className="px-3 py-2 font-semibold">{t('interviews.col.when')}</th>
            <th scope="col" className="px-3 py-2 font-semibold">{t('interviews.col.with')}</th>
            <th scope="col" className="px-3 py-2 font-semibold">{t('interviews.col.action')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {board.individual.map(({ member, interview }) => (
            <tr key={interview.id}>
              <th scope="row" className={`${CELL} font-medium`}>{member.fullName}</th>
              <td className={CELL}>
                {when(interview.startsAt)}
                <span className="block text-xs text-slate-500">{t(`interviews.mode.${interview.mode}`)}</span>
              </td>
              <td className={CELL}>{interviewerName(interview.interviewer)}</td>
              <td className={CELL}>
                {interview.status === 'scheduled' ? actions(member, interview) : t('interviews.status.done')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
