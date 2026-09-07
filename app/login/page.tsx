import { Suspense } from 'react';
import LoginForm from '@/components/LoginForm';
import { getT } from '@/lib/i18n/server';
import { magicLinkEnabled } from '@/lib/auth';

export default async function LoginPage() {
  const t = await getT();

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-2xl font-bold">{t('login.title')}</h1>
      <Suspense fallback={<p className="text-sm text-slate-500">{t('login.loading')}</p>}>
        <LoginForm magicLinkEnabled={magicLinkEnabled} />
      </Suspense>
    </div>
  );
}
