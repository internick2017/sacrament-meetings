import { redirect } from 'next/navigation';
import { getCurrentMeeting } from '@/lib/meetings-db';

export default async function CurrentMeetingPage() {
  const meeting = await getCurrentMeeting();

  if (!meeting) {
    redirect('/meetings');
  }

  redirect(`/meetings/${meeting.id}`);
}
