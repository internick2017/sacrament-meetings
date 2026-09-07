import { notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/authz';
import { getEventById } from '@/lib/events-db';
import { getUnit } from '@/lib/unit-db';
import { getLocale, getT } from '@/lib/i18n/server';
import { formatEventDateTime, type DictionaryKey } from '@/lib/i18n';

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

  return (
    <article className="space-y-4">
      <header>
        <p className="text-sm uppercase tracking-wide text-slate-500">{organizationLabel}</p>
        <h1 className="text-2xl font-bold">{event.title}</h1>
      </header>

      {event.coverUrl && (
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
    </article>
  );
}
