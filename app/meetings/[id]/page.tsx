import { notFound } from 'next/navigation';
import MeetingDetail from '@/components/MeetingDetail';
import { getBaseUrl } from '@/lib/get-base-url';
import type { SacramentMeeting } from '@/lib/types';

async function fetchMeeting(id: string): Promise<SacramentMeeting | null> {
  const res = await fetch(`${getBaseUrl()}/api/meetings/${id}`, { cache: 'no-store' });
  if (!res.ok) {
    return null;
  }
  return res.json();
}

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const meeting = await fetchMeeting(id);

  if (!meeting) {
    notFound();
  }

  return <MeetingDetail meeting={meeting} />;
}
