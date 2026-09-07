import Link from 'next/link';
import EventCard from '@/components/EventCard';
import { getSessionUser, canEditOrganization } from '@/lib/authz';
import { getEvents, PAST_EVENTS_LIMIT } from '@/lib/events-db';
import { getUnit } from '@/lib/unit-db';
import { getLocale, getT } from '@/lib/i18n/server';

export default async function ActivitiesPage() {
  // One page serves both layers, exactly like /organizations: the session
  // decides what the query returns, so there is no second copy of this page
  // to keep in sync. This also carries the admin/leader management UI (the
  // "new activity" button and each card's edit/delete controls), following
  // the same pattern as /meetings: there is no separate admin listing route,
  // since one would collide with this page's own /activities path.
  const [sessionUser, locale, t, unit] = await Promise.all([
    getSessionUser(),
    getLocale(),
    getT(),
    getUnit(),
  ]);
  const signedIn = !!sessionUser;
  const canCreate = sessionUser?.role === 'admin' || sessionUser?.role === 'leader';

  const [upcoming, past] = await Promise.all([
    getEvents({ signedIn, upcoming: true }),
    getEvents({ signedIn, upcoming: false, limit: PAST_EVENTS_LIMIT }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('activities.title')}</h1>
        {canCreate && (
          <Link
            href="/activities/new"
            className="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            {t('activities.new')}
          </Link>
        )}
      </div>
      <p className="max-w-2xl text-slate-600">{t('activities.intro')}</p>

      {/* An anonymous visitor is told there is more behind a sign-in, rather
          than being sent to a 404 that reads as a broken site. */}
      {!signedIn && (
        <p className="rounded bg-slate-100 px-3 py-2 text-sm text-slate-700">
          {t('activities.signedOutNote')}
        </p>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t('activities.upcoming')}</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-500">{t('activities.empty')}</p>
        ) : (
          <div className="space-y-4">
            {upcoming.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                t={t}
                locale={locale}
                timezone={unit.timezone}
                canEdit={canEditOrganization(sessionUser, event.organizationId)}
                signedIn={signedIn}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t('activities.past')}</h2>
        {past.length === 0 ? (
          <p className="text-sm text-slate-500">{t('activities.empty')}</p>
        ) : (
          <div className="space-y-4">
            {past.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                t={t}
                locale={locale}
                timezone={unit.timezone}
                canEdit={canEditOrganization(sessionUser, event.organizationId)}
                signedIn={signedIn}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
