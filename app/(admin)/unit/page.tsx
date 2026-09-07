import { redirect } from 'next/navigation';
import { getUnit } from '@/lib/unit-db';
import { getSessionUser } from '@/lib/authz';
import { getT } from '@/lib/i18n/server';
import UnitForm from '@/components/UnitForm';

export default async function UnitSettingsPage() {
  const [sessionUser, unit, t] = await Promise.all([getSessionUser(), getUnit(), getT()]);

  // The (admin) layout lets a leader through too, since /callings is shared.
  // /unit is admin-only: it edits congregation-wide settings, not one
  // organization, so it needs its own tighter gate here (same pattern as
  // /users).
  if (sessionUser?.role !== 'admin') {
    redirect('/login');
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">{t('unit.title')}</h1>
      <p className="max-w-xl text-slate-600">{t('unit.intro')}</p>
      <UnitForm unit={unit} />
    </section>
  );
}
