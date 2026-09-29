import { describe, expect, it } from 'vitest';
import { buildMagicLinkEmail } from './magic-link-email';

const url = 'https://unidade-franciscobeltrao.vercel.app/api/auth/callback/nodemailer?token=abc&email=a%40b.com';

describe('buildMagicLinkEmail', () => {
  it('names the unit in the subject and body', () => {
    const email = buildMagicLinkEmail({ url, unitName: 'Ala Francisco Beltrão' });
    expect(email.subject).toBe('Seu link de acesso ao site da Ala Francisco Beltrão');
    expect(email.text).toContain('site da Ala Francisco Beltrão');
    expect(email.html).toContain('<strong>Ala Francisco Beltrão</strong>');
  });

  it('carries the link as plain text in both versions, so it works without the button', () => {
    const email = buildMagicLinkEmail({ url, unitName: 'Ala Francisco Beltrão' });
    expect(email.text).toContain(url);
    expect(email.html).toContain(url.replace(/&/g, '&amp;'));
  });

  it('falls back to a neutral name when the unit has none yet', () => {
    const email = buildMagicLinkEmail({ url, unitName: '  ' });
    expect(email.subject).toBe('Seu link de acesso ao site da nossa unidade');
  });

  it('escapes the unit name in the HTML', () => {
    const email = buildMagicLinkEmail({ url, unitName: '<script>x</script>' });
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
  });
});
