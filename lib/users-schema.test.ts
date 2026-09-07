import { describe, it, expect } from 'vitest';
import { userFormSchema } from './users-schema';

const t = ((key: string) => key) as never;

const valid = { email: 'ana@example.com', role: 'member', organizationKey: '' };

describe('userFormSchema', () => {
  it('accepts a member with no organization', () => {
    expect(userFormSchema(t).safeParse(valid).success).toBe(true);
  });

  it('accepts a leader with an organization', () => {
    const result = userFormSchema(t).safeParse({
      email: 'rs@example.com',
      role: 'leader',
      organizationKey: 'relief_society',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a leader without an organization, which would be a leader of nothing', () => {
    const result = userFormSchema(t).safeParse({
      email: 'rs@example.com',
      role: 'leader',
      organizationKey: '',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['organizationKey']);
  });

  it('rejects an invalid e-mail', () => {
    const result = userFormSchema(t).safeParse({ ...valid, email: 'not-an-email' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['email']);
  });

  it('rejects an unknown role', () => {
    expect(userFormSchema(t).safeParse({ ...valid, role: 'bishop' }).success).toBe(false);
  });

  it('lowercases and trims the e-mail, because the allow-list matches case-insensitively', () => {
    const result = userFormSchema(t).safeParse({ ...valid, email: '  ANA@Example.com ' });
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe('ana@example.com');
  });
});
