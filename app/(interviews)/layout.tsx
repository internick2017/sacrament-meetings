import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getSessionUser } from '@/lib/authz';
import { signOutAction } from '@/lib/auth-actions';
import { getT } from '@/lib/i18n/server';
import NotAllowed from '@/components/NotAllowed';

// Its own route group because the (admin) layout lets in admin and leader,
// while interviews are for admin and secretary only: a leader must never see
// who was called in or their phone numbers. Same chrome as (admin).
export default async function InterviewsLayout({ children }: { children: React.ReactNode }) {
  const [session, user, t] = await Promise.all([auth(), getSessionUser(), getT()]);

  if (!user) {
    redirect('/login');
  }
  if (user.role !== 'admin' && user.role !== 'secretary') {
    return <NotAllowed />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 rounded bg-amber-50 px-4 py-2 text-sm text-amber-800">
        <span>
          {t('interviews.area')}
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
