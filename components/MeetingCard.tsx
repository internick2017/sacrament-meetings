import Link from 'next/link';
import type { SacramentMeeting } from '@/lib/types';
import { formatMeetingDate, type DictionaryKey } from '@/lib/i18n';
import { getLocale, getT } from '@/lib/i18n/server';
import DeleteMeetingButton from './DeleteMeetingButton';

// Maps the stored meeting type to its dictionary key, so the label follows the
// active language instead of being frozen at module load.
export const MEETING_TYPE_KEY: Record<SacramentMeeting['meetingType'], DictionaryKey> = {
  testimony: 'meetingType.testimony',
  regular: 'meetingType.regular',
  stake: 'meetingType.stake',
  general: 'meetingType.general',
  special: 'meetingType.special',
};

export default async function MeetingCard({
  meeting,
  isAdmin,
}: {
  meeting: SacramentMeeting;
  isAdmin: boolean;
}) {
  const [locale, t] = await Promise.all([getLocale(), getT()]);
  const formattedDate = formatMeetingDate(meeting.date, locale);

  return (
    <li className="rounded border border-slate-200 p-4 shadow-sm">
      <p className="text-sm uppercase tracking-wide text-slate-500">
        {t(MEETING_TYPE_KEY[meeting.meetingType])}
      </p>
      <h2 className="text-lg font-semibold">{formattedDate}</h2>
      <p className="text-sm text-slate-600">
        {t('meeting.presiding')}: {meeting.presiding}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link href={`/meetings/${meeting.id}`} className="text-slate-800 underline">
          {t('list.viewDetails')}
        </Link>
        {isAdmin ? (
          <>
            <Link href={`/meetings/${meeting.id}/edit`} className="text-slate-800 underline">
              {t('list.edit')}
            </Link>
            <DeleteMeetingButton id={meeting.id} />
          </>
        ) : null}
      </div>
    </li>
  );
}
