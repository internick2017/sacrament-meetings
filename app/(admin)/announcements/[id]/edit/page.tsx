import { redirect } from 'next/navigation';
import AnnouncementForm from '@/components/AnnouncementForm';
import { getSessionUser, canEditOrganization } from '@/lib/authz';
import { getAnnouncementById } from '@/lib/announcements-db';
import { getOrganizations } from '@/lib/organizations-db';
import { getT } from '@/lib/i18n/server';
import type { OrganizationKey } from '@/lib/types';

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);

  const [sessionUser, t] = await Promise.all([getSessionUser(), getT()]);

  if (!Number.isInteger(id)) {
    redirect('/announcements');
  }

  // signedIn is true here rather than gated on session presence: an admin or
  // leader is always signed in by the time they reach this admin-only route
  // (the (admin) layout already redirects anonymous visitors to /login),
  // and a private announcement must be visible to the person editing it.
  // includeExpired is true because the whole point of this screen is being
  // able to load and clear out an expired announcement.
  const announcement = await getAnnouncementById({ id, signedIn: true, includeExpired: true });
  if (!announcement) {
    redirect('/announcements');
  }

  // The permission check happens BEFORE anything is rendered: a leader must
  // never even see another organization's announcement form, let alone fill
  // it in and discover only at save time that they cannot submit it.
  if (!canEditOrganization(sessionUser, announcement.organizationId)) {
    redirect('/announcements');
  }

  const organizations = await getOrganizations(false);

  let organizationKeys: readonly OrganizationKey[];
  if (sessionUser!.role === 'admin') {
    organizationKeys = organizations.map((organization) => organization.key);
  } else {
    const own = organizations.find((organization) => organization.id === sessionUser!.organizationId);
    organizationKeys = own ? [own.key] : [];
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">{t('announcements.edit')}</h1>
      <AnnouncementForm
        organizationKeys={organizationKeys}
        allowBranchWide={sessionUser!.role === 'admin'}
        announcement={{
          id: announcement.id,
          organizationKey: announcement.organizationKey,
          title: announcement.title,
          body: announcement.body,
          startsOn: announcement.startsOn ?? '',
          endsOn: announcement.endsOn,
          audience: announcement.audience,
        }}
      />
    </section>
  );
}
