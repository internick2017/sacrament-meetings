import type { SacramentMeeting } from '@/lib/types';
import { formatMeetingDate } from '@/lib/i18n';
import { localizeHymn } from '@/lib/hymns';
import { getLocale, getT } from '@/lib/i18n/server';
import { MEETING_TYPE_KEY } from './MeetingCard';
import PrintButton from './PrintButton';

export default async function MeetingDetail({ meeting }: { meeting: SacramentMeeting }) {
  const [locale, t] = await Promise.all([getLocale(), getT()]);
  const formattedDate = formatMeetingDate(meeting.date, locale);

  // Hymn titles and numbers come from the hymnbook of the active language.
  const openingHymn = localizeHymn(meeting.openingHymn, locale);
  const sacramentHymn = localizeHymn(meeting.sacramentHymn, locale);
  const closingHymn = localizeHymn(meeting.closingHymn, locale);

  return (
    <article className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-500">
            {t(MEETING_TYPE_KEY[meeting.meetingType])}
          </p>
          <h1 className="text-2xl font-bold">{formattedDate}</h1>
        </div>
        <PrintButton />
      </header>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="font-semibold">{t('meeting.presiding')}</dt>
        <dd>{meeting.presiding}</dd>
        <dt className="font-semibold">{t('meeting.conducting')}</dt>
        <dd>{meeting.conducting}</dd>
      </dl>

      {meeting.announcements && meeting.announcements.length > 0 && (
        <section>
          <h2 className="font-semibold">{t('meeting.announcements')}</h2>
          <ul className="list-disc pl-5">
            {meeting.announcements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-semibold">{t('meeting.openingHymn')}</h2>
        <p>#{openingHymn.number} - {openingHymn.title}</p>
      </section>

      <section>
        <h2 className="font-semibold">{t('meeting.openingPrayer')}</h2>
        <p>{meeting.openingPrayer}</p>
      </section>

      {meeting.wardBusiness.length > 0 && (
        <section>
          <h2 className="font-semibold">{t('meeting.wardBusiness')}</h2>
          <ul className="list-disc pl-5">
            {meeting.wardBusiness.map((item) => (
              <li key={item.description}>{item.description}</li>
            ))}
          </ul>
        </section>
      )}

      {meeting.stakeBusiness && (
        <p className="italic text-slate-600">{t('meeting.stakeBusiness')}</p>
      )}

      <section>
        <h2 className="font-semibold">{t('meeting.sacramentHymn')}</h2>
        <p>#{sacramentHymn.number} - {sacramentHymn.title}</p>
      </section>

      {meeting.program.length > 0 && (
        <section>
          <h2 className="font-semibold">{t('meeting.program')}</h2>
          <ol className="list-decimal space-y-1 pl-5">
            {meeting.program.map((item, index) =>
              item.type === 'speaker' ? (
                <li key={index}>
                  {t('meeting.speaker')}: {item.name} - {item.topic}
                </li>
              ) : (
                <li key={index}>
                  {t('meeting.musicalNumber')}: {item.performer}
                  {item.title ? ` - ${item.title}` : ''}
                </li>
              )
            )}
          </ol>
        </section>
      )}

      <section>
        <h2 className="font-semibold">{t('meeting.closingHymn')}</h2>
        <p>#{closingHymn.number} - {closingHymn.title}</p>
      </section>

      <section>
        <h2 className="font-semibold">{t('meeting.closingPrayer')}</h2>
        <p>{meeting.closingPrayer}</p>
      </section>
    </article>
  );
}
