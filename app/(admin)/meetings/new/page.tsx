import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/authz';
import NewMeetingClient from './NewMeetingClient';
import NotAllowed from '@/components/NotAllowed';

// The (admin) layout lets a leader through too, since /callings is shared.
// Creating a meeting is admin-only, so it needs its own tighter gate here
// (same pattern as /users and /unit). This wrapper exists only to run that
// server-side check before the interactive form (NewMeetingClient) mounts.
// Anonymous still goes to /login; a signed-in leader sees NotAllowed rather
// than a login form.
export default async function NewMeetingPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect('/login');
  }
  if (sessionUser.role !== 'admin') {
    return <NotAllowed />;
  }

  return <NewMeetingClient />;
}
