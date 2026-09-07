import { getOrganizations } from '@/lib/organizations-db';
import { getSessionUser } from '@/lib/authz';
import { getT } from '@/lib/i18n/server';
import CallingForm from '@/components/CallingForm';
import CallingRowActions from '@/components/CallingRowActions';
import type { DictionaryKey } from '@/lib/i18n';

export default async function CallingsPage() {
  const [sessionUser, allOrganizations, t] = await Promise.all([
    getSessionUser(),
    getOrganizations(true),
    getT(),
  ]);

  // /callings is shared between admin and leader (unlike /users or /unit).
  // An admin sees every organization; a leader sees only their own, in both
  // the list below and the org picker in the add form. This is UI scoping
  // only — the server-side guard in callings-actions.ts (requireLeaderOf)
  // still enforces who can actually write to which organization.
  const organizations =
    sessionUser?.role === 'admin'
      ? allOrganizations
      : allOrganizations.filter((organization) => organization.id === sessionUser?.organizationId);

  // A leader whose account has no organizationId yet (not assigned by an
  // admin) would otherwise see an empty, unusable <select> in CallingForm —
  // organizationKeys would be []. Show a clear message instead of a form
  // with nothing to pick.
  if (sessionUser?.role !== 'admin' && organizations.length === 0) {
    return (
      <section className="space-y-6">
        <h1 className="text-2xl font-bold">{t('callings.title')}</h1>
        <p className="max-w-xl text-slate-600">{t('callings.noOrganizationAssigned')}</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">{t('callings.title')}</h1>
      <p className="max-w-xl text-slate-600">{t('callings.intro')}</p>

      <CallingForm organizationKeys={organizations.map((organization) => organization.key)} />

      <div className="space-y-4">
        <h2 className="text-xl font-bold">{t('callings.current')}</h2>

        {organizations.map((organization) => (
          <div key={organization.id} className="space-y-2">
            <h3 className="font-semibold">
              {t(`organization.${organization.key}` as DictionaryKey)}
            </h3>

            {organization.callings.length === 0 ? (
              <p className="text-sm text-slate-500">{t('organizations.noCallings')}</p>
            ) : (
              <ul className="space-y-1">
                {organization.callings.map((calling) => (
                  <li
                    key={calling.id}
                    className="flex items-center justify-between gap-4 rounded border border-slate-200 px-3 py-2"
                  >
                    <span>
                      {calling.title} — {calling.personName}
                    </span>
                    <CallingRowActions
                      id={calling.id}
                      personId={calling.personId}
                      personPhotoUrl={calling.personPhotoUrl}
                      isAdmin={sessionUser?.role === 'admin'}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
