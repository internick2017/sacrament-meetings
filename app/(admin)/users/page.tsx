import { redirect } from 'next/navigation';
import { listUsers } from '@/lib/users-db';
import { getSessionUser } from '@/lib/authz';
import { getT } from '@/lib/i18n/server';
import UserForm from '@/components/UserForm';
import UserRowActions from '@/components/UserRowActions';
import type { DictionaryKey } from '@/lib/i18n';

export default async function UsersPage() {
  const [sessionUser, t] = await Promise.all([getSessionUser(), getT()]);

  // The (admin) layout lets a leader through too, since /callings is shared.
  // /users is admin-only: it manages every account in the congregation, not
  // just one organization, so it needs its own tighter gate here. The roster
  // is only queried after this check passes, so an unauthorized request
  // never touches the full user table.
  if (sessionUser?.role !== 'admin') {
    redirect('/login');
  }

  const users = await listUsers();

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">{t('users.title')}</h1>
      <p className="max-w-xl text-slate-600">{t('users.intro')}</p>

      <UserForm />

      {/* Part of the design, not decoration: the switch below can turn on
          profile-photo uploads for any account, and the system has no way
          to know who is a minor (this project deliberately stores no birth
          dates). The bishopric decides, one account at a time, and this
          text is the only thing standing between the switch and that
          decision being skipped. */}
      <p className="max-w-xl rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        {t('users.photoWarning')}
      </p>

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
                email={user.email ?? ''}
                role={user.role}
                organizationKey={user.organizationKey ?? ''}
                photoUploadAllowed={user.photoUploadAllowed}
                isSelf={String(user.id) === String(sessionUser?.id)}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
