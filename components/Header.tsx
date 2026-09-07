import Link from 'next/link';
import NavLinks from './NavLinks';
import LocaleSwitcher from './LocaleSwitcher';
import { getSessionUser } from '@/lib/authz';
import { DATE_LOCALES } from '@/lib/i18n/config';
import { getLocale } from '@/lib/i18n/server';

const WARD_NAME = 'Riverside Ward';

export default async function Header() {
  const [locale, user] = await Promise.all([getLocale(), getSessionUser()]);

  const today = new Date().toLocaleDateString(DATE_LOCALES[locale], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="no-print bg-slate-800 text-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="text-lg font-semibold">
          {WARD_NAME}
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
