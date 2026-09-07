import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/authz';
import NewMeetingClient from './NewMeetingClient';

// The (admin) layout lets a leader through too, since /callings is shared.
// Creating a meeting is admin-only, so it needs its own tighter gate here
// (same pattern as /users and /unit). This wrapper exists only to run that
// server-side check before the interactive form (NewMeetingClient) mounts.
export default async function NewMeetingPage() {
  const sessionUser = await getSessionUser();

  if (sessionUser?.role !== 'admin') {
    redirect('/login');
  }

  return <NewMeetingClient />;
}
