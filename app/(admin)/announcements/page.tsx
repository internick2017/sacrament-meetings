import Link from 'next/link';
import AnnouncementList from '@/components/AnnouncementList';
import AnnouncementRowActions from '@/components/AnnouncementRowActions';
import { getAnnouncements } from '@/lib/announcements-db';
import { getSessionUser } from '@/lib/authz';
import { getT, getLocale } from '@/lib/i18n/server';
import { getUnit } from '@/lib/unit-db';

export default async function AnnouncementsAdminPage() {
  const [sessionUser, t, locale, unit] = await Promise.all([
    getSessionUser(),
    getT(),
    getLocale(),
    getUnit(),
  ]);

  // A leader whose account has no organizationId yet cannot own any
  // announcement, so there is nothing this screen could ever list for them.
  // Same account state, and same explanation, as new/page.tsx: show why
  // instead of falling back to an organizationId of -1 and letting it read
  // as the ordinary "no announcements yet" empty state.
  if (sessionUser?.role === 'leader' && sessionUser.organizationId == null) {
    return (
      <section className="space-y-6">
        <h1 className="text-2xl font-bold">{t('announcements.title')}</h1>
        <p role="alert">{t('announcements.noOrganizationAssigned')}</p>
      </section>
    );
  }

  // signedIn is true here rather than gated on session presence: an admin
  // or leader is always signed in by the time they reach this admin-only
  // route (the (admin) layout already redirects anonymous visitors to
  // /login), and a private announcement must be visible to whoever
  // administers it. includeExpired is true because clearing out expired
  // notices is exactly what this screen is for — it cannot act on a row it
  // cannot load.
  const allAnnouncements = await getAnnouncements({
    signedIn: true,
    organizationId: sessionUser?.role === 'admin' ? undefined : (sessionUser?.organizationId ?? -1),
    includeExpired: true,
  });

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">{t('announcements.title')}</h1>
      <p className="max-w-xl text-slate-600">{t('announcements.intro')}</p>

      <Link
        href="/announcements/new"
        className="inline-block rounded bg-slate-800 px-5 py-2 font-semibold text-white hover:bg-slate-700"
      >
        {t('announcements.new')}
      </Link>

      {allAnnouncements.length === 0 ? (
        <p className="text-sm text-slate-500">{t('announcements.empty')}</p>
      ) : (
        <AnnouncementList
          announcements={allAnnouncements}
          t={t}
          locale={locale}
          timezone={unit.timezone}
          showExpired
          renderActions={(announcement) => <AnnouncementRowActions id={announcement.id} />}
        />
      )}
    </section>
  );
}
