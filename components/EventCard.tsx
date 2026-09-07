import Link from 'next/link';
import type { EventItem } from '@/lib/types';
import type { Translator, DictionaryKey, Locale } from '@/lib/i18n';
import { formatEventDateTime } from '@/lib/i18n';

export default function EventCard({
  event,
  t,
  locale,
  timezone,
}: {
  event: EventItem;
  t: Translator;
  locale: Locale;
  timezone: string;
}) {
  const organizationLabel = event.organizationKey
    ? t(`organization.${event.organizationKey}` as DictionaryKey)
    : t('activities.branchWide');

  const formattedDate = formatEventDateTime(event.startsAt, event.allDay, locale, timezone);

  return (
    <section className="overflow-hidden rounded border border-slate-200">
      {/* Most activities have no cover yet (the upload credential does not
          exist), so the image is a bonus row when present rather than a
          placeholder gap when absent — the card is fully laid out either
          way. */}
      {event.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.coverUrl}
          alt=""
          className="h-40 w-full object-cover"
        />
      )}
      <div className="space-y-1 p-4">
        <h3 className="text-lg font-semibold">
          <Link href={`/activities/${event.id}`} className="hover:underline">
            {event.title}
          </Link>
        </h3>
        <p className="text-sm text-slate-600">{formattedDate}</p>
        <p className="text-sm text-slate-600">{event.location}</p>
        <p className="text-sm font-medium text-slate-500">{organizationLabel}</p>
      </div>
    </section>
  );
}
