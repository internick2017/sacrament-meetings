export type MeetingType = 'testimony' | 'regular' | 'stake' | 'general' | 'special';

export interface Hymn {
  number: number;
  title: string;
}

export type ProgramItem =
  | { type: 'speaker'; name: string; topic: string }
  | { type: 'musical-number'; performer: string; title?: string };

export interface WardBusinessItem {
  description: string;
}

export interface SacramentMeeting {
  id: number;
  date: string; // ISO date string: 'YYYY-MM-DD'
  meetingType: MeetingType;
  presiding: string;
  conducting: string;
  announcements?: string[];
  openingHymn: Hymn;
  openingPrayer: string;
  wardBusiness: WardBusinessItem[];
  stakeBusiness: boolean;
  sacramentHymn: Hymn;
  program: ProgramItem[];
  closingHymn: Hymn;
  closingPrayer: string;
}

export type UnitType = 'ward' | 'branch';

// The single unit (ward or branch) this site belongs to. Contact details of
// members never live here: only the unit's own public information plus links
// out to the official Church tools.
export interface Unit {
  id: number;
  name: string;
  unitType: UnitType;
  stakeName: string;
  address: string;
  meetingTimes: string;
  timezone: string;
  calendarUrl: string;
  directoryUrl: string;
  contactNote: string;
}

// The fixed set of organizations a ward or branch has. The display name is NOT
// stored: it comes from the i18n dictionary under `organization.<key>`, so it
// reads correctly in all three languages.
export const ORGANIZATION_KEYS = [
  'bishopric',
  'elders_quorum',
  'relief_society',
  'young_men',
  'young_women',
  'primary',
  'sunday_school',
] as const;

export type OrganizationKey = (typeof ORGANIZATION_KEYS)[number];

export interface Organization {
  id: number;
  key: OrganizationKey;
  displayOrder: number;
}

// A person is a name. Nothing else is stored, on purpose: contact details live
// in the official Church tools.
export interface Person {
  id: number;
  fullName: string;
}

// `personName` is undefined on the public layer, where positions are listed
// without the people holding them.
export interface Calling {
  id: number;
  title: string;
  // Absent on the public layer, alongside personName: hideNames() strips both
  // so a stable per-person identifier never reaches an anonymous visitor.
  personId?: number;
  personName?: string;
  displayOrder: number;
}

export interface OrganizationWithCallings extends Organization {
  callings: Calling[];
}
