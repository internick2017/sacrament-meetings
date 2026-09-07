import type { OrganizationKey } from './types';

// Activities of these organizations involve children and youth, so their
// photos are published by the bishopric, not by whoever took them. This is a
// rule of the system and deliberately NOT a checkbox a leader can untick: the
// first time someone is in a hurry, a checkbox gets unticked.
export const ORGANIZATIONS_REQUIRING_APPROVAL: readonly OrganizationKey[] = [
  'primary',
  'young_men',
  'young_women',
];

// Written as an allow-list of organizations that do NOT need approval, so that
// anything unrecognised — a null organization, a key added later, a typo —
// falls on the safe side and waits for an admin.
const NO_APPROVAL_NEEDED: readonly string[] = [
  'bishopric',
  'elders_quorum',
  'relief_society',
  'sunday_school',
];

export function needsApproval(organizationKey: OrganizationKey | null): boolean {
  if (organizationKey === null) {
    return true;
  }
  return !NO_APPROVAL_NEEDED.includes(organizationKey);
}
