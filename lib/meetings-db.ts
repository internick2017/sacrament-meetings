import type { SacramentMeeting } from './types';

// Async on purpose: swapping this for a real database later only means
// changing this file — every caller already awaits these functions.

const meetings: SacramentMeeting[] = [
  {
    id: 1,
    date: '2026-06-14',
    meetingType: 'regular',
    presiding: 'Bishop Daniel Reyes',
    conducting: 'First Counselor Mark Ito',
    announcements: [
      'Ward campout moved to July 25',
      'Temple recommend interviews this week',
    ],
    openingHymn: { number: 19, title: 'We Thank Thee, O God, for a Prophet' },
    openingPrayer: 'Sister Alvarez',
    wardBusiness: [
      { description: 'Sustaining of Brother Kim as Elders Quorum secretary' },
    ],
    stakeBusiness: false,
    sacramentHymn: { number: 173, title: 'While of These Emblems We Partake' },
    program: [
      { type: 'speaker', name: 'Sister Johnson', topic: 'Faith in Jesus Christ' },
      { type: 'musical-number', performer: 'Primary Children', title: 'I Am a Child of God' },
      { type: 'speaker', name: 'Brother Lee', topic: 'Enduring to the End' },
    ],
    closingHymn: { number: 85, title: 'How Firm a Foundation' },
    closingPrayer: 'Brother Nguyen',
  },
  {
    id: 2,
    date: '2026-06-21',
    meetingType: 'testimony',
    presiding: 'Bishop Daniel Reyes',
    conducting: 'Second Counselor Priya Patel',
    announcements: ['Fast offerings due to the bishop by Friday'],
    openingHymn: { number: 30, title: 'Come, Come, Ye Saints' },
    openingPrayer: 'Brother Osei',
    wardBusiness: [],
    stakeBusiness: false,
    sacramentHymn: { number: 169, title: "'Tis Sweet to Sing the Matchless Love" },
    program: [],
    closingHymn: { number: 152, title: 'God Be with You Till We Meet Again' },
    closingPrayer: 'Sister Marsh',
  },
  {
    id: 3,
    date: '2026-06-28',
    meetingType: 'general',
    presiding: 'Bishop Daniel Reyes',
    conducting: 'First Counselor Mark Ito',
    announcements: ['Building closed for cleaning Monday'],
    openingHymn: { number: 2, title: 'The Spirit of God' },
    openingPrayer: 'Sister Choi',
    wardBusiness: [],
    stakeBusiness: false,
    sacramentHymn: { number: 175, title: 'O God, the Eternal Father' },
    program: [{ type: 'speaker', name: 'General Conference broadcast', topic: 'N/A' }],
    closingHymn: { number: 5, title: 'High on the Mountain Top' },
    closingPrayer: 'Brother Wallace',
  },
  {
    id: 4,
    date: '2026-07-05',
    meetingType: 'regular',
    presiding: 'Bishop Daniel Reyes',
    conducting: 'First Counselor Mark Ito',
    announcements: [
      'Youth activity Wednesday at 6pm',
      'New family moving in on Birch St, meals sign-up in foyer',
    ],
    openingHymn: { number: 7, title: 'Israel, Israel, God Is Calling' },
    openingPrayer: 'Brother Kim',
    wardBusiness: [
      { description: 'Release of Sister Tran as Relief Society secretary' },
      { description: 'Sustaining of Sister Ford as Relief Society secretary' },
    ],
    stakeBusiness: false,
    sacramentHymn: { number: 193, title: 'In Humility, Our Savior' },
    program: [
      { type: 'speaker', name: 'Brother Alvarez', topic: 'The Atonement of Jesus Christ' },
      { type: 'musical-number', performer: 'Sister Ford', title: 'Love One Another' },
      { type: 'speaker', name: 'Sister Wallace', topic: 'Ministering to One Another' },
    ],
    closingHymn: { number: 301, title: 'I Am a Child of God' },
    closingPrayer: 'Sister Patel',
  },
  {
    id: 5,
    date: '2026-07-12',
    meetingType: 'stake',
    presiding: 'Stake President Harold Ferreira',
    conducting: 'Stake President Harold Ferreira',
    announcements: ['Stake conference broadcast to all wards'],
    openingHymn: { number: 19, title: 'We Thank Thee, O God, for a Prophet' },
    openingPrayer: 'Sister Nguyen',
    wardBusiness: [],
    stakeBusiness: true,
    sacramentHymn: { number: 169, title: "'Tis Sweet to Sing the Matchless Love" },
    program: [
      { type: 'speaker', name: 'Stake President Harold Ferreira', topic: 'Building Zion Together' },
    ],
    closingHymn: { number: 152, title: 'God Be with You Till We Meet Again' },
    closingPrayer: 'Brother Choi',
  },
];

export async function getMeetings(date?: string): Promise<SacramentMeeting[]> {
  const sorted = [...meetings].sort((a, b) => a.date.localeCompare(b.date));
  if (date) {
    return sorted.filter((meeting) => meeting.date === date);
  }
  return sorted;
}

export async function getMeetingById(id: number): Promise<SacramentMeeting | undefined> {
  return meetings.find((meeting) => meeting.id === id);
}

// "Current" = the most recent meeting on or before today, falling back to the
// earliest meeting if every seed date is still in the future. With this static
// seed data, once real time passes the last seed date (2026-07-12), this will
// keep returning that last meeting -- expected for temporary in-memory data,
// not a bug (a real database would just have new rows added weekly).
export async function getCurrentMeeting(): Promise<SacramentMeeting | undefined> {
  const all = await getMeetings();
  const todayISO = new Date().toISOString().slice(0, 10);
  const pastOrToday = all.filter((meeting) => meeting.date <= todayISO);
  if (pastOrToday.length > 0) {
    return pastOrToday[pastOrToday.length - 1];
  }
  return all[0];
}
