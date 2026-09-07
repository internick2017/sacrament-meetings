import { notFound } from 'next/navigation';
import { getSessionUser, canEditOrganization } from '@/lib/authz';
import { getEventById } from '@/lib/events-db';
import { getEventPhotos } from '@/lib/event-photos-db';
import { getUnit } from '@/lib/unit-db';
import { needsApproval } from '@/lib/photo-rules';
import { photoUploadEnabled } from '@/lib/blob';
import { getLocale, getT } from '@/lib/i18n/server';
import { formatEventDateTime, type DictionaryKey } from '@/lib/i18n';
import EventGallery from '@/components/EventGallery';

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);

  if (!Number.isInteger(numericId)) {
    notFound();
  }

  const [sessionUser, locale, t, unit] = await Promise.all([
    getSessionUser(),
    getLocale(),
    getT(),
    getUnit(),
  ]);
  const signedIn = !!sessionUser;

  const event = await getEventById(numericId, signedIn);

  // A 404 here is correct, not the forbidden "hide a page that exists for
  // this visitor" pattern: getEventById already applies the audience filter,
  // so a private activity requested by an anonymous visitor comes back as
  // `undefined` — for that visitor, this row does not exist at all, the same
  // as a made-up id. It exists as a distinct page only for a session that
  // may see it.
  if (!event) {
    notFound();
  }

  const organizationLabel = event.organizationKey
    ? t(`organization.${event.organizationKey}` as DictionaryKey)
    : t('activities.branchWide');

  const startFormatted = formatEventDateTime(event.startsAt, event.allDay, locale, unit.timezone);
  const endFormatted = event.endsAt
    ? formatEventDateTime(event.endsAt, event.allDay, locale, unit.timezone)
    : null;

  // The gallery is private, full stop: an anonymous visitor sees no photos
  // at all, not even on an otherwise-public activity. Everything below is
  // skipped entirely when there is no session, rather than computed and
  // then hidden, so a signed-out request never even queries event_photos.
  const canEdit = canEditOrganization(sessionUser, event.organizationId);
  const photos = signedIn ? await getEventPhotos(event.id, { includeUnapproved: canEdit }) : [];
  const willNeedApproval = needsApproval(event.organizationKey);

  return (
    <article className="space-y-4">
      <header>
        <p className="text-sm uppercase tracking-wide text-slate-500">{organizationLabel}</p>
        <h1 className="text-2xl font-bold">{event.title}</h1>
      </header>

      {/* A cover photo is a photograph like any other: on an activity whose
          organization requires approval, it is withheld from anonymous
          visitors the same way the gallery is, using the same server-side
          rule (needsApproval) rather than a second, drifting check. */}
      {event.coverUrl && (signedIn || !willNeedApproval) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.coverUrl} alt="" className="w-full rounded object-cover" />
      )}

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="font-semibold">{t('activities.from')}</dt>
        <dd>{startFormatted}</dd>
        {endFormatted && (
          <>
            <dt className="font-semibold">{t('activities.to')}</dt>
            <dd>{endFormatted}</dd>
          </>
        )}
        {event.location && (
          <>
            <dt className="font-semibold">{t('activities.where')}</dt>
            <dd>{event.location}</dd>
          </>
        )}
      </dl>

      {event.description && <p className="whitespace-pre-line">{event.description}</p>}

      {signedIn && (
        <EventGallery
          eventId={event.id}
          photos={photos}
          canEdit={canEdit}
          photoUploadEnabled={photoUploadEnabled}
          willNeedApproval={willNeedApproval}
          t={t}
        />
      )}
    </article>
  );
}
