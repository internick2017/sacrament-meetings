import { redirect } from 'next/navigation';
import EventForm from '@/components/EventForm';
import { getSessionUser, canEditOrganization } from '@/lib/authz';
import { getEventById } from '@/lib/events-db';
import { getOrganizations } from '@/lib/organizations-db';
import { getUnit } from '@/lib/unit-db';
import { toDatetimeLocalValue } from '@/lib/timezone';
import { getT } from '@/lib/i18n/server';
import { coverUploadEnabled } from '@/lib/blob';
import type { OrganizationKey } from '@/lib/types';

export default async function EditActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);

  const [sessionUser, t] = await Promise.all([getSessionUser(), getT()]);

  if (!Number.isInteger(id)) {
    redirect('/activities');
  }

  // signedIn is true here rather than gated on session presence: an admin or
  // leader is always signed in by the time they reach this admin-only route
  // (the (admin) layout already redirects anonymous visitors to /login), and
  // a private activity must be visible to the person editing it.
  const event = await getEventById(id, true);
  if (!event) {
    redirect('/activities');
  }

  // The permission check happens BEFORE anything is rendered: a leader must
  // never even see another organization's activity form, let alone fill it
  // in and discover only at save time that they cannot submit it.
  if (!canEditOrganization(sessionUser, event.organizationId)) {
    redirect('/activities');
  }

  const [organizations, unit] = await Promise.all([getOrganizations(false), getUnit()]);

  let organizationKeys: readonly OrganizationKey[];
  if (sessionUser!.role === 'admin') {
    organizationKeys = organizations.map((organization) => organization.key);
  } else {
    const own = organizations.find((organization) => organization.id === sessionUser!.organizationId);
    organizationKeys = own ? [own.key] : [];
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">{t('activities.edit')}</h1>
      <EventForm
        organizationKeys={organizationKeys}
        allowBranchWide={sessionUser!.role === 'admin'}
        coverUploadEnabled={coverUploadEnabled}
        event={{
          id: event.id,
          organizationKey: event.organizationKey,
          title: event.title,
          description: event.description,
          location: event.location,
          startsAt: toDatetimeLocalValue(event.startsAt, unit.timezone),
          endsAt: event.endsAt ? toDatetimeLocalValue(event.endsAt, unit.timezone) : '',
          allDay: event.allDay,
          audience: event.audience,
          coverUrl: event.coverUrl,
        }}
      />
    </section>
  );
}
