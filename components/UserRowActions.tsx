'use client';

import { updateUserRoleAction, deleteUserAction } from '@/lib/users-actions';
import { useT } from '@/lib/i18n/client';
import { ROLES, ORGANIZATION_KEYS } from '@/lib/types';
import type { DictionaryKey } from '@/lib/i18n';

const SELECT = 'rounded border border-slate-300 px-2 py-1 text-sm';

// An admin cannot act on their own row: no role select, no delete button,
// only a note explaining why (see users.self). Losing the last admin would
// leave the congregation with no one able to administer the site.
export default function UserRowActions({
  id,
  role,
  organizationKey,
  isSelf,
}: {
  id: number;
  role: string;
  organizationKey: string;
  isSelf: boolean;
}) {
  const t = useT();

  if (isSelf) {
    return <span className="text-sm text-slate-400">{t('users.self')}</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={updateUserRoleAction} className="flex items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <select name="role" defaultValue={role} className={SELECT}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {t(`role.${r}` as DictionaryKey)}
            </option>
          ))}
        </select>
        <select name="organizationKey" defaultValue={organizationKey} className={SELECT}>
          <option value="">{t('users.none')}</option>
          {ORGANIZATION_KEYS.map((key) => (
            <option key={key} value={key}>
              {t(`organization.${key}` as DictionaryKey)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {t('users.save')}
        </button>
      </form>

      <form
        action={deleteUserAction}
        onSubmit={(event) => {
          if (!window.confirm(t('users.confirmRemove'))) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          className="rounded border border-red-300 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50"
        >
          {t('users.remove')}
        </button>
      </form>
    </div>
  );
}
