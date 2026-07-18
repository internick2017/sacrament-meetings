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
