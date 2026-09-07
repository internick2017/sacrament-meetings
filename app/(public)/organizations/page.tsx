import { auth } from '@/lib/auth';
import { getT } from '@/lib/i18n/server';
import { getOrganizations } from '@/lib/organizations-db';
import OrganizationCard from '@/components/OrganizationCard';

export default async function OrganizationsPage() {
  // One page serves both layers. The session decides what the query returns,
  // so there is no second copy of this page to keep in sync.
  const [session, t] = await Promise.all([auth(), getT()]);
  const showNames = !!session;
  const organizations = await getOrganizations(showNames);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('organizations.title')}</h1>
      <p className="max-w-2xl text-slate-600">{t('organizations.intro')}</p>

      {/* An anonymous visitor is told there is more behind a sign-in, rather
          than being sent to a 404 that reads as a broken site. */}
      {!showNames && (
        <p className="rounded bg-slate-100 px-3 py-2 text-sm text-slate-700">
          {t('organizations.signedOutNote')}
        </p>
      )}

      <div className="space-y-4">
        {organizations.map((organization) => (
          <OrganizationCard
            key={organization.id}
            organization={organization}
            t={t}
            showNames={showNames}
          />
        ))}
      </div>
    </div>
  );
}
