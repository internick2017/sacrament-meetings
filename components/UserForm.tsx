'use client';

import { useActionState, useState } from 'react';
import { addUserAction, type UserFormState } from '@/lib/users-actions';
import { useT } from '@/lib/i18n/client';
import { ROLES, ORGANIZATION_KEYS } from '@/lib/types';
import type { DictionaryKey } from '@/lib/i18n';

const INPUT = 'w-full rounded border border-slate-300 px-3 py-2';

export default function UserForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState<UserFormState, FormData>(addUserAction, {});

  // Same remount-by-key pattern as CallingForm.tsx: useActionState returns a
  // new state object per submission, but React reuses the uncontrolled input
  // DOM nodes, so a new defaultValue alone would not show up without this.
  const [formInstance, setFormInstance] = useState(0);
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    setFormInstance((n) => n + 1);
  }

  function fieldError(name: string) {
    return (
      <p id={`${name}-error`} aria-live="polite" className="min-h-5 text-sm text-red-600">
        {state.errors?.[name]?.[0]}
      </p>
    );
  }

  return (
    <form key={formInstance} action={formAction} className="max-w-xl space-y-4">
      {state.message && (
        <p role="alert" aria-live="polite" className="rounded bg-slate-100 px-3 py-2 text-sm">
          {state.message}
        </p>
      )}

      <label className="block space-y-1">
        <span className="font-semibold">{t('users.email')}</span>
        <input
          type="email"
          name="email"
          defaultValue={state.values?.email ?? ''}
          aria-describedby="email-error"
          className={INPUT}
        />
        {fieldError('email')}
      </label>

      <label className="block space-y-1">
        <span className="font-semibold">{t('users.role')}</span>
        <select
          name="role"
          defaultValue={state.values?.role ?? ROLES[ROLES.length - 1]}
          aria-describedby="role-error"
          className={INPUT}
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {t(`role.${role}` as DictionaryKey)}
            </option>
          ))}
        </select>
        {fieldError('role')}
      </label>

      <label className="block space-y-1">
        <span className="font-semibold">{t('users.organization')}</span>
        <select
          name="organizationKey"
          defaultValue={state.values?.organizationKey ?? ''}
          aria-describedby="organizationKey-error"
          className={INPUT}
        >
          <option value="">{t('users.none')}</option>
          {ORGANIZATION_KEYS.map((key) => (
            <option key={key} value={key}>
              {t(`organization.${key}` as DictionaryKey)}
            </option>
          ))}
        </select>
        {fieldError('organizationKey')}
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-slate-800 px-5 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {t('users.add')}
      </button>
    </form>
  );
}
