'use client';

import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { loginAction, type LoginFormState } from '@/lib/auth-actions';
import { useT } from '@/lib/i18n/client';

const initialState: LoginFormState = {};

const inputClass =
  'w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const t = useT();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/meetings';
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div>
        <label htmlFor="username" className="block text-sm font-medium">
          {t('login.username')}
        </label>
        <input id="username" name="username" type="text" required className={inputClass} />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          {t('login.password')}
        </label>
        <input id="password" name="password" type="password" required className={inputClass} />
      </div>
      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-red-600">
        {state.error}
      </p>
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {isPending ? t('login.submitting') : t('login.submit')}
      </button>
    </form>
  );
}
