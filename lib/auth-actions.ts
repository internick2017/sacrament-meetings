'use server';

import { AuthError } from 'next-auth';
import { signIn, signOut } from './auth';
import { getT } from './i18n/server';
import { hasRecentVerificationToken } from './users-db';
import { safeCallbackUrl } from './safe-redirect';

export interface LoginFormState {
  error?: string;
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

  // Rate limit here, before signIn() ever runs: @auth/core sends the e-mail
  // and writes the verification-token row in a Promise.all, so a throttle
  // placed inside the adapter (createVerificationToken) cannot stop the
  // e-mail — it can only skip the row, leaving a second, newer, dead link in
  // the recipient's inbox. Refusing to start the flow at all is the only
  // place this can actually work. The response below is unconditional and
  // identical to the accepted path, so a throttled request reveals nothing.
  if (!(await hasRecentVerificationToken(email))) {
    try {
      await signIn('resend', { email, redirect: false });
    } catch (error) {
      if (!(error instanceof AuthError)) {
        throw error;
      }
    }
  }

  return { message: t('login.magicSent') };
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/meetings' });
}
