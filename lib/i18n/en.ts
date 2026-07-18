export const dictionary = {
  'nav.home': 'Home',
  'nav.meetings': 'Meetings',
  'nav.current': "This Week's Meeting",
  'meeting.announcements': 'Announcements',
  'meeting.openingHymn': 'Opening Hymn',
  'meeting.openingPrayer': 'Opening Prayer',
  'meeting.wardBusiness': 'Ward Business',
  'meeting.stakeBusiness': 'Stake business was conducted in this meeting.',
  'meeting.sacramentHymn': 'Sacrament Hymn',
  'meeting.program': 'Speakers & Musical Numbers',
  'meeting.closingHymn': 'Closing Hymn',
  'meeting.closingPrayer': 'Closing Prayer',
  'meeting.presiding': 'Presiding',
  'meeting.conducting': 'Conducting',
  'meeting.print': 'Print Program',
  'meeting.speaker': 'Speaker',
  'meeting.musicalNumber': 'Musical Number',
  'meetingType.testimony': 'Fast & Testimony Meeting',
  'meetingType.regular': 'Regular Sacrament Meeting',
  'meetingType.stake': 'Stake Conference',
  'meetingType.general': 'General Conference',
  'meetingType.special': 'Special Meeting',
  'list.title': 'All Meetings',
  'list.viewDetails': 'View Program',
  'list.empty': 'No meetings match your search.',
  'search.label': 'Search meetings',
  'search.placeholder': 'Search by speaker, presiding, conducting, or type',
  'pagination.label': 'Meetings pagination',
  'pagination.previous': 'Previous',
  'pagination.next': 'Next',
  'pagination.page': 'Page',
  'home.heading': 'Plan and Review Sacrament Meetings',
  'home.subheading':
    'Manage agendas, track speakers and hymns, and print programs for your ward.',
  'home.cta': 'View Meetings',
} as const;

export type DictionaryKey = keyof typeof dictionary;

export function t(key: DictionaryKey): string {
  return dictionary[key];
}
