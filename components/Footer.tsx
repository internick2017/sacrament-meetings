import { getT } from '@/lib/i18n/server';

export default async function Footer() {
  const t = await getT();

  return (
    <footer className="no-print mt-12 border-t border-slate-200 py-6 text-center text-sm text-slate-500">
      <p>{t('footer.text')}</p>
    </footer>
  );
}
