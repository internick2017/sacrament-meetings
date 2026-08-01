'use client';

import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { loginAction, type LoginFormState } from '@/lib/auth-actions';

const initialState: LoginFormState = {};

const inputClass =
  'w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/meetings';
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-2xl font-bold">Sign in</h1>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <div>
          <label htmlFor="username" className="block text-sm font-medium">
            Username
          </label>
          <input id="username" name="username" type="text" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
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
          {isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
