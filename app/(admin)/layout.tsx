import { auth } from '@/lib/auth';
import { signOutAction } from '@/lib/auth-actions';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded bg-amber-50 px-4 py-2 text-sm text-amber-800">
        <span>
          Admin area{session?.user?.name ? ` — signed in as ${session.user.name}` : ''}
        </span>
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded border border-amber-300 px-3 py-1 font-semibold hover:bg-amber-100"
          >
            Sign out
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
