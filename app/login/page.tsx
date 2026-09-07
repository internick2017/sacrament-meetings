import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/LoginForm';
import { getT } from '@/lib/i18n/server';
import { magicLinkEnabled } from '@/lib/auth';
import { getSessionUser } from '@/lib/authz';
import { safeCallbackUrl } from '@/lib/safe-redirect';

export default async function LoginPage({
  searchParams,
}: {
  // In Next.js 16 searchParams is async: it must be awaited before use.
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const t = await getT();

  // Someone who is already signed in has no business seeing a sign-in form:
  // it reads as though the session did not take, which is exactly how it was
  // reported — a magic link worked, landed back here, and looked like it had
  // failed. Sending them where they were headed makes the outcome visible.
  //
  // callbackUrl comes from the query string, so it goes through the same
  // same-app check the login form uses; a crafted /login?callbackUrl=... must
  // not become an open redirect just because the visitor happens to have a
  // session already.
  const sessionUser = await getSessionUser();
  if (sessionUser) {
    const { callbackUrl } = await searchParams;
    redirect(safeCallbackUrl(callbackUrl));
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-2xl font-bold">{t('login.title')}</h1>
      <Suspense fallback={<p className="text-sm text-slate-500">{t('login.loading')}</p>}>
        <LoginForm magicLinkEnabled={magicLinkEnabled} />
      </Suspense>
    </div>
  );
}
