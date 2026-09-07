import { redirect } from 'next/navigation';
import { listUsers } from '@/lib/users-db';
import { getSessionUser } from '@/lib/authz';
import { getT } from '@/lib/i18n/server';
import UserForm from '@/components/UserForm';
import UserRowActions from '@/components/UserRowActions';
import type { DictionaryKey } from '@/lib/i18n';

export default async function UsersPage() {
  const [users, sessionUser, t] = await Promise.all([listUsers(), getSessionUser(), getT()]);

  // The (admin) layout lets a leader through too, since /callings is shared.
  // /users is admin-only: it manages every account in the congregation, not
  // just one organization, so it needs its own tighter gate here.
  if (sessionUser?.role !== 'admin') {
    redirect('/login');
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">{t('users.title')}</h1>
      <p className="max-w-xl text-slate-600">{t('users.intro')}</p>

      <UserForm />

      <div className="space-y-2">
        <h2 className="text-xl font-bold">{t('users.current')}</h2>

        <ul className="space-y-1">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded border border-slate-200 px-3 py-2"
            >
              <span>
                {user.email ?? '—'} —{' '}
                {t(`role.${user.role}` as DictionaryKey)}
                {user.organizationKey
                  ? ` (${t(`organization.${user.organizationKey}` as DictionaryKey)})`
                  : ''}
              </span>
              <UserRowActions
                id={user.id}
                role={user.role}
                organizationKey={user.organizationKey ?? ''}
                isSelf={String(user.id) === String(sessionUser?.id)}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
