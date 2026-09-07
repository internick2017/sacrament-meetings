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

export const AUDIENCES = ['public', 'private'] as const;

export type Audience = (typeof AUDIENCES)[number];

// An activity. `organizationId` null means it belongs to the whole branch,
// which only an admin may edit. This table records what happens, never who
// attends.
export interface EventItem {
  id: number;
  organizationId: number | null;
  organizationKey: OrganizationKey | null;
  title: string;
  description: string;
  location: string;
  startsAt: string; // ISO 8601
  endsAt: string | null;
  allDay: boolean;
  audience: Audience;
  coverUrl: string | null;
}

export type EventInput = Omit<EventItem, 'id' | 'organizationKey'>;

// An announcement: a piece of text with an expiry. `organizationId` null means
// it belongs to the whole unit, which only an admin may write.
export interface Announcement {
  id: number;
  organizationId: number | null;
  organizationKey: OrganizationKey | null;
  title: string;
  body: string;
  startsOn: string | null; // 'YYYY-MM-DD'
  endsOn: string; // 'YYYY-MM-DD', never null: announcements expire on purpose
  audience: Audience;
}

export type AnnouncementInput = Omit<Announcement, 'id' | 'organizationKey'>;

// A photo attached to an activity. `approved` is false until an admin (or,
// for organizations that do not need approval, automatically) publishes it.
// Who uploaded or approved it is a data-layer concern (uploaded_by,
// approved_by columns): this public shape stays minimal on purpose.
export interface EventPhoto {
  id: number;
  eventId: number;
  url: string;
  caption: string;
  approved: boolean;
}

export const ROLES = ['admin', 'leader', 'member'] as const;

export type Role = (typeof ROLES)[number];

// What the application knows about whoever is making the current request.
// `organizationId` is only meaningful for a leader: it is the one organization
// they may edit.
export interface SessionUser {
  id: string;
  role: Role;
  organizationId: number | null;
}
