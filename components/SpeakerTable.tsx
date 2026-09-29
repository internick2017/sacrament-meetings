'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useLocale, useT } from '@/lib/i18n/client';
import { formatMeetingDate } from '@/lib/i18n';
import { foldName, foldSearch, weeksBetween, type MeetingRef, type SpeakerSummary } from '@/lib/speakers';

export default function SpeakerTable({ rows, today }: { rows: SpeakerSummary[]; today: string }) {
  const t = useT();
  const locale = useLocale();
  const [query, setQuery] = useState('');

  const needle = foldSearch(query);
  const visible = needle ? rows.filter((row) => foldName(row.name).includes(needle)) : rows;

  function meetingLink(ref: MeetingRef) {
    return (
      <Link href={`/meetings/${ref.meetingId}`} className="text-blue-700 underline">
        {formatMeetingDate(ref.date, locale)}
      </Link>
    );
  }

  function weeksAgo(date: string): string {
    const weeks = weeksBetween(date, today);
    if (weeks === 0) return t('speakers.thisWeek');
    if (weeks === 1) return t('speakers.weeksAgoOne');
    return t('speakers.weeksAgo', { count: weeks });
  }

  return (
    <div className="space-y-3">
      <label htmlFor="speaker-search" className="sr-only">
        {t('speakers.search')}
      </label>
      <input
        id="speaker-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('speakers.search')}
        className="w-full max-w-sm rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      />

      {visible.length === 0 ? (
        <p className="text-slate-500">{t('speakers.noMatch')}</p>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">{t('speakers.name')}</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">{t('speakers.times')}</th>
                <th scope="col" className="px-3 py-2 font-semibold">{t('speakers.last')}</th>
                <th scope="col" className="px-3 py-2 font-semibold">{t('speakers.next')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visible.map((row) => (
                <tr key={foldName(row.name)}>
                  <th scope="row" className="px-3 py-2 font-medium">{row.name}</th>
                  <td className="px-3 py-2 text-right tabular-nums">{row.timesSpoken}</td>
                  <td className="px-3 py-2">
                    {row.lastSpoke ? (
                      <>
                        <span className="whitespace-nowrap">{meetingLink(row.lastSpoke)}</span>
                        <span className="block text-xs text-slate-500">{weeksAgo(row.lastSpoke.date)}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {row.nextScheduled ? meetingLink(row.nextScheduled) : '—'}
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
