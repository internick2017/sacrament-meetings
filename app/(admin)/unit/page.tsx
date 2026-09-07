import { getUnit } from '@/lib/unit-db';
import { getT } from '@/lib/i18n/server';
import UnitForm from '@/components/UnitForm';

export default async function UnitSettingsPage() {
  const [unit, t] = await Promise.all([getUnit(), getT()]);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">{t('unit.title')}</h1>
      <p className="max-w-xl text-slate-600">{t('unit.intro')}</p>
      <UnitForm unit={unit} />
    </section>
  );
}
