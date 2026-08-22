import { notFound } from 'next/navigation';
import { getMeetingById } from '@/lib/meetings-db';
import EditMeetingForm from './EditMeetingForm';
import { getT } from '@/lib/i18n/server';

export default async function EditMeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getT();
  const { id } = await params;
  const numericId = Number(id);

  // A non-integer id, or an id with no matching row, renders the local
  // not-found.tsx instead of crashing.
  const meeting = Number.isInteger(numericId)
    ? await getMeetingById(numericId)
    : undefined;

  if (!meeting) {
    notFound();
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t('form.editTitle')}</h1>
      <EditMeetingForm meeting={meeting} />
    </div>
  );
}
