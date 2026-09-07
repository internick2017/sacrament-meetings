import { describe, it, expect } from 'vitest';
import { canEditOrganization } from './authz';
import type { SessionUser } from './types';

const admin: SessionUser = { id: '1', role: 'admin', organizationId: null };
const reliefSocietyLeader: SessionUser = { id: '2', role: 'leader', organizationId: 30 };
const member: SessionUser = { id: '3', role: 'member', organizationId: null };

describe('canEditOrganization', () => {
  it('lets an admin edit any organization', () => {
    expect(canEditOrganization(admin, 30)).toBe(true);
    expect(canEditOrganization(admin, 60)).toBe(true);
  });

  it('lets an admin edit branch-wide content, which has no organization', () => {
    expect(canEditOrganization(admin, null)).toBe(true);
  });

  it('lets a leader edit their own organization', () => {
    expect(canEditOrganization(reliefSocietyLeader, 30)).toBe(true);
  });

  it('does NOT let a leader edit another organization', () => {
    expect(canEditOrganization(reliefSocietyLeader, 60)).toBe(false);
  });

  it('does NOT let a leader edit branch-wide content', () => {
    expect(canEditOrganization(reliefSocietyLeader, null)).toBe(false);
  });

  it('does NOT let a leader with no organization edit anything', () => {
    const orphan: SessionUser = { id: '4', role: 'leader', organizationId: null };
    expect(canEditOrganization(orphan, 30)).toBe(false);
    expect(canEditOrganization(orphan, null)).toBe(false);
  });

  it('does NOT let a member edit anything', () => {
    expect(canEditOrganization(member, 30)).toBe(false);
    expect(canEditOrganization(member, null)).toBe(false);
  });

  it('does NOT let an anonymous visitor edit anything', () => {
    expect(canEditOrganization(null, 30)).toBe(false);
    expect(canEditOrganization(null, null)).toBe(false);
  });

  // A leader whose organizationId arrives as a string from a JWT round-trip
  // must not compare equal to a different organization by coercion.
  it('compares organizations strictly, never by coercion', () => {
    const weird = { id: '5', role: 'leader', organizationId: '30' } as unknown as SessionUser;
    expect(canEditOrganization(weird, 30)).toBe(false);
  });
});
