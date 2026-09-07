import Link from 'next/link';
import { getT } from '@/lib/i18n/server';

// Shown instead of redirecting to /login when a SIGNED-IN user reaches a
// page their role does not allow. Redirecting them to /login would show a
// login form to someone who is already logged in, which reads as a broken
// loop. An anonymous visitor never sees this component: they are stopped
// earlier, by middleware.ts and by the `redirect('/login')` checks that
// still run first in every gate.
export default async function NotAllowed() {
  const t = await getT();

  return (
    <section className="mx-auto max-w-xl space-y-4 py-12 text-center">
      <h1 className="text-2xl font-bold">{t('forbidden.title')}</h1>
      <p className="text-slate-600">{t('forbidden.body')}</p>
      <Link href="/" className="inline-block text-blue-700 underline">
        {t('forbidden.backHome')}
      </Link>
    </section>
  );
}
