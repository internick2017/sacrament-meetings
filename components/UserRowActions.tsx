'use client';

import { useActionState } from 'react';
import {
  updateUserRoleAction,
  updatePhotoUploadAllowedAction,
  deleteUserAction,
  type UserRowState,
} from '@/lib/users-actions';
import { useT } from '@/lib/i18n/client';
import { ROLES, ORGANIZATION_KEYS } from '@/lib/types';
import type { DictionaryKey } from '@/lib/i18n';

const SELECT = 'rounded border border-slate-300 px-2 py-1 text-sm';

// An admin cannot act on their own row: no role select, no delete button, no
// photo-upload switch, only a note explaining why (see users.self). Losing
// the last admin would leave the congregation with no one able to
// administer the site, and toggling one's own upload switch is a decision
// meant for someone else on the bishopric to make, same as everything else
// on this row.
export default function UserRowActions({
  id,
  email,
  role,
  organizationKey,
  photoUploadAllowed,
  isSelf,
}: {
  id: number;
  email: string;
  role: string;
  organizationKey: string;
  photoUploadAllowed: boolean;
  isSelf: boolean;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState<UserRowState, FormData>(
    updateUserRoleAction,
    {}
  );

  if (isSelf) {
    return <span className="text-sm text-slate-400">{t('users.self')}</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={id} />
        {/* These are per-row controls in a flat list, so the accessible name
            also carries whose row it is (via email) — otherwise a
            screen-reader user moving down the list hears identical unlabeled
            controls. */}
        <select
          name="role"
          defaultValue={role}
          aria-label={`${email} — ${t('users.role')}`}
          className={SELECT}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {t(`role.${r}` as DictionaryKey)}
            </option>
          ))}
        </select>
        <select
          name="organizationKey"
          defaultValue={organizationKey}
          aria-label={`${email} — ${t('users.organization')}`}
          className={SELECT}
        >
          <option value="">{t('users.none')}</option>
          {ORGANIZATION_KEYS.map((key) => (
            <option key={key} value={key}>
              {t(`organization.${key}` as DictionaryKey)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {t('users.save')}
        </button>
        {state.message && (
          <p role="alert" aria-live="polite" className="w-full text-sm text-slate-600">
            {state.message}
          </p>
        )}
      </form>

      {/* A void action (no useActionState) same as deleteUserAction below:
          this is a single boolean flip with nothing to report back beyond
          the new state, which the revalidated list already shows. */}
      <form action={updatePhotoUploadAllowedAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="allowed" value={String(!photoUploadAllowed)} />
        <button
          type="submit"
          className="rounded border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {photoUploadAllowed ? t('users.photoUploadDisable') : t('users.photoUploadEnable')}
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
