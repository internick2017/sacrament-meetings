import { redirect, notFound } from 'next/navigation';
import { getMeetingById, getMeetingChanges } from '@/lib/meetings-db';
import { getSessionUser } from '@/lib/authz';
import { listMembers } from '@/lib/members-db';
import EditMeetingForm from './EditMeetingForm';
import { getT } from '@/lib/i18n/server';
import NotAllowed from '@/components/NotAllowed';
import MeetingHistory from '@/components/MeetingHistory';

export default async function EditMeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sessionUser = await getSessionUser();

  // The (admin) layout lets a leader through too, since /callings is shared.
  // Editing a meeting is admin-only, so it needs its own tighter gate here
  // (same pattern as /users, /unit, and /meetings/new). Anonymous still goes
  // to /login; a signed-in leader sees NotAllowed rather than a login form.
  if (!sessionUser) {
    redirect('/login');
  }
  if (sessionUser.role !== 'admin') {
    return <NotAllowed />;
  }

  const t = await getT();
  const { id } = await params;
  const numericId = Number(id);

  // A non-integer id, or an id with no matching row, renders the local
  // not-found.tsx instead of crashing.
  const [meeting, members, changes] = await Promise.all([
    Number.isInteger(numericId) ? getMeetingById(numericId) : undefined,
    listMembers(),
    Number.isInteger(numericId) ? getMeetingChanges(numericId) : [],
  ]);

  if (!meeting) {
    notFound();
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t('form.editTitle')}</h1>
      <EditMeetingForm meeting={meeting} memberNames={members.map((member) => member.fullName)} />
      <MeetingHistory changes={changes} />
    </div>
  );
}
