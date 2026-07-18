import { redirect } from 'next/navigation';
import { getCurrentMeeting } from '@/lib/meetings-db';

// "Current" depends on today's date, so this must be computed per request
// rather than baked in at build time.
export const dynamic = 'force-dynamic';

export default async function CurrentMeetingPage() {
  const meeting = await getCurrentMeeting();

  if (!meeting) {
    redirect('/meetings');
  }

  redirect(`/meetings/${meeting.id}`);
}
