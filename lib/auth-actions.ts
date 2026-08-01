'use server';

import { AuthError } from 'next-auth';
import { signIn, signOut } from './auth';

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
      return { error: 'Invalid username or password.' };
    }
    throw error;
  }
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/meetings' });
}
