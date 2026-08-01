import Link from 'next/link';
import type { SacramentMeeting } from '@/lib/types';
import { t } from '@/lib/i18n/en';
import DeleteMeetingButton from './DeleteMeetingButton';

const meetingTypeLabel: Record<SacramentMeeting['meetingType'], string> = {
  testimony: t('meetingType.testimony'),
  regular: t('meetingType.regular'),
  stake: t('meetingType.stake'),
  general: t('meetingType.general'),
  special: t('meetingType.special'),
};

export default function MeetingCard({
  meeting,
  isAdmin,
}: {
  meeting: SacramentMeeting;
  isAdmin: boolean;
}) {
  const formattedDate = new Date(`${meeting.date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <li className="rounded border border-slate-200 p-4 shadow-sm">
      <p className="text-sm uppercase tracking-wide text-slate-500">
        {meetingTypeLabel[meeting.meetingType]}
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
              Edit
            </Link>
            <DeleteMeetingButton id={meeting.id} />
          </>
        ) : null}
      </div>
    </li>
  );
}
