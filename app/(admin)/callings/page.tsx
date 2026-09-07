import { getOrganizations } from '@/lib/organizations-db';
import { getT } from '@/lib/i18n/server';
import CallingForm from '@/components/CallingForm';
import CallingRowActions from '@/components/CallingRowActions';
import type { DictionaryKey } from '@/lib/i18n';

export default async function CallingsPage() {
  const [organizations, t] = await Promise.all([getOrganizations(true), getT()]);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">{t('callings.title')}</h1>
      <p className="max-w-xl text-slate-600">{t('callings.intro')}</p>

      <CallingForm />

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
                    <CallingRowActions id={calling.id} />
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
