import { getLocale, getT } from '@/lib/i18n/server';
import { formatEventDateTime, formatMeetingDate } from '@/lib/i18n';
import { getUnit } from '@/lib/unit-db';
import type { DeletedMeeting } from '@/lib/meetings-db';

// Meetings that were deleted, with who deleted each one. A deleted meeting has
// no page of its own, so this is the only place that record can be read. It
// names accounts: the caller must render it for an admin only.
export default async function DeletedMeetings({ deleted }: { deleted: DeletedMeeting[] }) {
  if (deleted.length === 0) {
    return null;
  }
  const [t, locale, unit] = await Promise.all([getT(), getLocale(), getUnit()]);

  return (
    <details className="mt-8 rounded border border-slate-200 p-4">
      <summary className="cursor-pointer">
        <h2 className="inline text-lg font-semibold">
          {t('meeting.history.deletedTitle', { count: deleted.length })}
        </h2>
      </summary>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        {deleted.map((meeting) => (
          <li key={meeting.id}>
            <span className="font-semibold">{formatMeetingDate(meeting.meetingDate, locale)}</span>
            <br />
            {t('meeting.history.deleted', {
              who: meeting.deletedBy ?? t('meeting.history.unknownUser'),
            })}
            <span className="text-slate-500">
              {' · '}
              {formatEventDateTime(meeting.deletedAt, false, locale, unit.timezone)}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
