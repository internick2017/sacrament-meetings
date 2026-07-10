import MeetingCard from '@/components/MeetingCard';
import { getBaseUrl } from '@/lib/get-base-url';
import type { SacramentMeeting } from '@/lib/types';
import { t } from '@/lib/i18n/en';

async function fetchMeetings(): Promise<SacramentMeeting[]> {
  const res = await fetch(`${getBaseUrl()}/api/meetings`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to load meetings');
  }
  return res.json();
}

export default async function MeetingsPage() {
  const meetings = await fetchMeetings();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t('list.title')}</h1>
      <ul className="space-y-4">
        {meetings.map((meeting) => (
          <MeetingCard key={meeting.id} meeting={meeting} />
        ))}
      </ul>
    </div>
  );
}
