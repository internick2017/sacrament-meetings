import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { signOutAction } from '@/lib/auth-actions';
import { getT } from '@/lib/i18n/server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [session, t] = await Promise.all([auth(), getT()]);

  // This is the real gate for every admin route: the middleware matcher is
  // defence in depth, not the barrier itself. Without this check, a future
  // migration off the deprecated `middleware.ts` convention that drops or
  // mistypes a route could expose the full roster with no error anywhere.
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded bg-amber-50 px-4 py-2 text-sm text-amber-800">
        <span>
          {t('admin.area')}
          {session?.user?.name
            ? `, ${t('admin.signedInAs', { name: session.user.name })}`
            : ''}
        </span>
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded border border-amber-300 px-3 py-1 font-semibold hover:bg-amber-100"
          >
            {t('admin.signOut')}
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
