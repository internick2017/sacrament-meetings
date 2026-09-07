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
