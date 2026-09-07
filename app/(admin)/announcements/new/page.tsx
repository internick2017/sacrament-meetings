import { redirect } from 'next/navigation';
import AnnouncementForm from '@/components/AnnouncementForm';
import { getSessionUser } from '@/lib/authz';
import { getOrganizations } from '@/lib/organizations-db';
import { getT } from '@/lib/i18n/server';
import type { OrganizationKey } from '@/lib/types';

export default async function NewAnnouncementPage() {
  const [sessionUser, t] = await Promise.all([getSessionUser(), getT()]);

  // The (admin) layout already lets admin and leader through; a member with
  // a stray session should still never reach this form.
  if (!sessionUser || (sessionUser.role !== 'admin' && sessionUser.role !== 'leader')) {
    redirect('/login');
  }

  let organizationKeys: readonly OrganizationKey[];
  if (sessionUser.role === 'admin') {
    const organizations = await getOrganizations(false);
    organizationKeys = organizations.map((organization) => organization.key);
  } else {
    // A leader whose account has no organizationId yet would otherwise see
    // an empty, unusable picker. Rather than bouncing them back to
    // /announcements with no explanation, tell them why they cannot create
    // one.
    if (sessionUser.organizationId == null) {
      return (
        <section className="space-y-6">
          <h1 className="text-2xl font-bold">{t('announcements.new')}</h1>
          <p role="alert">{t('activities.noOrganizationAssigned')}</p>
        </section>
      );
    }
    const organizations = await getOrganizations(false);
    const own = organizations.find((organization) => organization.id === sessionUser.organizationId);
    organizationKeys = own ? [own.key] : [];
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">{t('announcements.new')}</h1>
      <AnnouncementForm
        organizationKeys={organizationKeys}
        allowBranchWide={sessionUser.role === 'admin'}
      />
    </section>
  );
}
