'use server';

import { AuthError } from 'next-auth';
import { signIn, signOut } from './auth';
import { getT } from './i18n/server';

export interface LoginFormState {
  error?: string;
}

// Only allow redirecting back to a same-app relative path. formData's
// callbackUrl is client-controlled, so a bare string would let a crafted
// login link redirect somewhere off-site after a successful sign-in.
function safeCallbackUrl(value: FormDataEntryValue | null): string {
  if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) {
    return value;
  }
  return '/meetings';
}

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  try {
    await signIn('credentials', {
      username: formData.get('username'),
      password: formData.get('password'),
      redirectTo: safeCallbackUrl(formData.get('callbackUrl')),
    });
    return {};
  } catch (error) {
    // signIn() throws a special redirect error internally on success — only
    // treat actual AuthError instances as a failed login, and let anything
    // else (like that redirect) propagate.
    if (error instanceof AuthError) {
      const t = await getT();
      return { error: t('login.invalid') };
    }
    throw error;
  }
}

export interface MagicLinkFormState {
  message?: string;
}

// The response is identical whether or not the e-mail is in the allow-list.
// Telling the two apart would let anyone probe which addresses belong to the
// congregation; the signIn callback in auth.ts already rejects an unknown
// address silently (returns false), so any AuthError raised here also gets
// the same neutral message rather than a distinguishing one.
export async function requestMagicLinkAction(
  _prevState: MagicLinkFormState,
  formData: FormData
): Promise<MagicLinkFormState> {
  const t = await getT();
  const email = String(formData.get('email') ?? '').trim();

  try {
    await signIn('resend', { email, redirect: false });
  } catch (error) {
    if (!(error instanceof AuthError)) {
      throw error;
    }
  }

  return { message: t('login.magicSent') };
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/meetings' });
}
