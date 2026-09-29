import { afterEach, describe, expect, it, vi } from 'vitest';

// Same boundary mocks as auth.test.ts: next-auth's entry pulls in next/server,
// which vitest cannot resolve, and the adapter would open a real connection.
vi.mock('next-auth', () => ({
  default: () => ({ handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }),
}));
vi.mock('./db', () => ({ sql: { query: vi.fn() } }));

// auth.ts picks the e-mail provider once, at import time, from the
// environment, so each case stubs the variables and imports a fresh copy.
async function loadAuth(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const name of ['AUTH_GMAIL_USER', 'AUTH_GMAIL_APP_PASSWORD', 'AUTH_RESEND_KEY']) {
    vi.stubEnv(name, env[name] ?? '');
  }
  return import('./auth');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('magic-link provider selection', () => {
  it('uses Gmail when its account and app password are set, even if Resend is too', async () => {
    const auth = await loadAuth({
      AUTH_GMAIL_USER: 'ward@gmail.com',
      AUTH_GMAIL_APP_PASSWORD: 'app-password',
      AUTH_RESEND_KEY: 're_key',
    });
    expect(auth.magicLinkProviderId).toBe('nodemailer');
    expect(auth.magicLinkEnabled).toBe(true);
  });

  it('falls back to Resend when Gmail is only half configured', async () => {
    const auth = await loadAuth({ AUTH_GMAIL_USER: 'ward@gmail.com', AUTH_RESEND_KEY: 're_key' });
    expect(auth.magicLinkProviderId).toBe('resend');
  });

  it('turns magic links off when no provider is configured', async () => {
    const auth = await loadAuth({});
    expect(auth.magicLinkProviderId).toBeNull();
    expect(auth.magicLinkEnabled).toBe(false);
  });
});
