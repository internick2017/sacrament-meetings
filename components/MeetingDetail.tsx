import type { SacramentMeeting } from '@/lib/types';
import { t } from '@/lib/i18n/en';
import PrintButton from './PrintButton';

const meetingTypeLabel: Record<SacramentMeeting['meetingType'], string> = {
  testimony: t('meetingType.testimony'),
  regular: t('meetingType.regular'),
  stake: t('meetingType.stake'),
  general: t('meetingType.general'),
  special: t('meetingType.special'),
};

export default function MeetingDetail({ meeting }: { meeting: SacramentMeeting }) {
  const formattedDate = new Date(`${meeting.date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <article className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-500">
            {meetingTypeLabel[meeting.meetingType]}
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
        <p>#{meeting.openingHymn.number} - {meeting.openingHymn.title}</p>
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
        <p>#{meeting.sacramentHymn.number} - {meeting.sacramentHymn.title}</p>
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
        <p>#{meeting.closingHymn.number} - {meeting.closingHymn.title}</p>
      </section>

      <section>
        <h2 className="font-semibold">{t('meeting.closingPrayer')}</h2>
        <p>{meeting.closingPrayer}</p>
      </section>
    </article>
  );
}
