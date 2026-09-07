import Link from 'next/link';
import type { EventItem } from '@/lib/types';
import type { Translator, DictionaryKey, Locale } from '@/lib/i18n';
import { formatEventDateTime } from '@/lib/i18n';
import { needsApproval } from '@/lib/photo-rules';
import EventRowActions from './EventRowActions';

export default function EventCard({
  event,
  t,
  locale,
  timezone,
  canEdit = false,
  signedIn,
}: {
  event: EventItem;
  t: Translator;
  locale: Locale;
  timezone: string;
  // Whether the signed-in viewer may edit (and delete) this activity —
  // canEditOrganization(sessionUser, event.organizationId), decided by the
  // caller so this component stays a plain presentational card. Following
  // the same isAdmin-passed-down pattern as MeetingCard.tsx, except this one
  // is per-card rather than page-wide: a leader can edit some activities
  // (their own organization's) and not others (another organization's, or a
  // branch-wide one) on the very same list.
  canEdit?: boolean;
  // Whether the current viewer has a session. A cover photo is a photograph
  // like any other: on an activity whose organization requires approval
  // (needsApproval), it is withheld from anonymous visitors the same way the
  // gallery is, using the very same server-side rule — this is not a second,
  // drifting policy.
  signedIn: boolean;
}) {
  const organizationLabel = event.organizationKey
    ? t(`organization.${event.organizationKey}` as DictionaryKey)
    : t('activities.branchWide');

  const formattedDate = formatEventDateTime(event.startsAt, event.allDay, locale, timezone);

  const showCover = event.coverUrl && (signedIn || !needsApproval(event.organizationKey));

  return (
    <section className="overflow-hidden rounded border border-slate-200">
      {/* Most activities have no cover yet (the upload credential does not
          exist), so the image is a bonus row when present rather than a
          placeholder gap when absent — the card is fully laid out either
          way. */}
      {showCover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.coverUrl ?? undefined}
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
        {canEdit && (
          <div className="mt-2 flex items-center gap-3">
            <Link href={`/activities/${event.id}/edit`} className="text-slate-800 underline">
              {t('activities.edit')}
            </Link>
            <EventRowActions id={event.id} />
          </div>
        )}
      </div>
    </section>
  );
}
