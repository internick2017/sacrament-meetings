'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '@/lib/i18n/en';

const links = [
  { href: '/', label: t('nav.home') },
  { href: '/meetings', label: t('nav.meetings') },
  { href: '/meetings/current', label: t('nav.current') },
];

export default function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const allLinks = isAdmin ? links : [...links, { href: '/login', label: 'Sign in' }];

  return (
    <nav className="bg-slate-900">
      <ul className="mx-auto flex max-w-4xl gap-4 px-4 py-2 text-sm">
        {allLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={
                  isActive
                    ? 'font-semibold text-white underline'
                    : 'text-slate-300 hover:text-white'
                }
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
