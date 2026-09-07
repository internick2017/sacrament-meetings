import Image from 'next/image';
import Link from 'next/link';
import AnnouncementList from '@/components/AnnouncementList';
import { getT, getLocale } from '@/lib/i18n/server';
import { getUnit } from '@/lib/unit-db';
import { getAnnouncements } from '@/lib/announcements-db';
import { getSessionUser } from '@/lib/authz';

export default async function HomePage() {
  const [t, locale, unit, sessionUser] = await Promise.all([
    getT(),
    getLocale(),
    getUnit(),
    getSessionUser(),
  ]);

  // In-force announcements this visitor may see: getAnnouncements already
  // excludes expired ones by default, and audienceFilter (inside it) already
  // excludes private ones for an anonymous visitor.
  const announcements = await getAnnouncements({ signedIn: sessionUser !== null });

  // Every unit field is optional in practice: a freshly migrated database has
  // them all empty, and the page has to look deliberate in that state rather
  // than showing a column of blank labels.
  const officialLinks = [
    { href: unit.calendarUrl, label: t('unit.officialCalendar') },
    { href: unit.directoryUrl, label: t('unit.officialDirectory') },
  ].filter((link) => link.href !== '');

  return (
    <section className="flex flex-col items-center gap-6 text-center">
      <Image
        src="/meetinghouse.svg"
        alt={t('home.imageAlt')}
        width={640}
        height={400}
        priority
      />
      <h1 className="text-3xl font-bold">{unit.name || t('home.heading')}</h1>
      {unit.stakeName && <p className="text-slate-500">{unit.stakeName}</p>}
      <p className="max-w-xl text-slate-600">{t('home.subheading')}</p>

      {(unit.meetingTimes || unit.address) && (
        <div className="space-y-1 text-slate-700">
          {unit.meetingTimes && <p>{unit.meetingTimes}</p>}
          {unit.address && <p>{unit.address}</p>}
        </div>
      )}

      <Link
        href="/meetings"
        className="rounded bg-slate-800 px-5 py-2 font-semibold text-white hover:bg-slate-700"
      >
        {t('home.cta')}
      </Link>

      {officialLinks.length > 0 && (
        <nav className="space-y-2">
          <h2 className="font-semibold">{t('unit.officialLinks')}</h2>
          <ul className="flex flex-wrap justify-center gap-4">
            {officialLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-slate-700 underline hover:text-slate-900"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {unit.contactNote && (
        <p className="max-w-xl text-sm text-slate-500">{unit.contactNote}</p>
      )}

      {/* Same rule as the official-links block above: with nothing to show,
          the section does not render at all. A front page with an
          "Announcements" heading over an empty list looks broken. */}
      {announcements.length > 0 && (
        <div className="w-full max-w-xl space-y-2 text-left">
          <h2 className="text-center font-semibold">{t('announcements.current')}</h2>
          <AnnouncementList
            announcements={announcements}
            t={t}
            locale={locale}
            timezone={unit.timezone}
          />
        </div>
      )}
    </section>
  );
}
