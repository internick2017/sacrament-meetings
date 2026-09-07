import Link from 'next/link';
import NavLinks from './NavLinks';
import LocaleSwitcher from './LocaleSwitcher';
import { getSessionUser } from '@/lib/authz';
import { getUnit } from '@/lib/unit-db';
import { getLocale, getT } from '@/lib/i18n/server';
import { formatMeetingDate } from '@/lib/i18n';
import { todayInTimeZone } from '@/lib/timezone';

export default async function Header() {
  const [locale, user, unit, t] = await Promise.all([
    getLocale(),
    getSessionUser(),
    getUnit(),
    getT(),
  ]);

  const wardName = unit.name || t('header.unnamedUnit');

  // Uses the congregation's own timezone (not the server's) so "today"
  // matches the calendar day the congregation is actually in, then formats
  // that plain calendar date for the active locale — same pattern as every
  // other date-in-the-wrong-zone fix in this project. If unit.timezone is
  // somehow invalid, fall back to the runtime's own zone rather than
  // throwing: the header renders on every page.
  let todayDate: string;
  try {
    todayDate = todayInTimeZone(unit.timezone);
  } catch {
    todayDate = todayInTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }
  const today = formatMeetingDate(todayDate, locale);

  return (
    <header className="no-print bg-slate-800 text-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="text-lg font-semibold">
          {wardName}
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <p className="text-sm text-slate-300">{today}</p>
          <LocaleSwitcher />
        </div>
      </div>
      <NavLinks role={user?.role ?? null} />
    </header>
  );
}
