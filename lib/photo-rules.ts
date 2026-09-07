import type { OrganizationKey } from './types';

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
