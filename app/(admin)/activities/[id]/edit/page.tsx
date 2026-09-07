import { redirect } from 'next/navigation';
import EventForm from '@/components/EventForm';
import { getSessionUser, canEditOrganization } from '@/lib/authz';
import { getEventById } from '@/lib/events-db';
import { getOrganizations } from '@/lib/organizations-db';
import { getUnit } from '@/lib/unit-db';
import { getT } from '@/lib/i18n/server';
import type { OrganizationKey } from '@/lib/types';

// Renders a stored ISO instant as the 'YYYY-MM-DDTHH:mm' value a
// datetime-local input expects, in the congregation's own timezone (the same
// one formatEventDateTime uses to display it) rather than the server's or
// the visitor's — so editing an activity shows the time it was actually set
// to, not a shifted one.
function toDatetimeLocalValue(isoString: string, timeZone: string): string {
  const format = (zone: string | undefined) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(isoString));

  // The schema now blocks new bad timezones (see unit-schema.ts), but this
  // is the last line of defence for an activity edited before that
  // validation existed: an unrecognized IANA zone must never throw and 500
  // the edit page, it should just fall back to the server's own timezone,
  // same as formatEventDateTime does on the public pages.
  let parts;
  try {
    parts = format(timeZone);
  } catch {
    parts = format(undefined);
  }

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

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
        }}
      />
    </section>
  );
}
