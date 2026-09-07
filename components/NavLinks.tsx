'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '@/lib/i18n/client';
import type { DictionaryKey } from '@/lib/i18n';

// Labels are resolved at render time (not module load) so they follow the
// active language.
const links: { href: string; label: DictionaryKey }[] = [
  { href: '/', label: 'nav.home' },
  { href: '/meetings', label: 'nav.meetings' },
  { href: '/meetings/current', label: 'nav.current' },
  { href: '/organizations', label: 'nav.organizations' },
];

export default function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const t = useT();
  // Signed in: the unit settings link replaces the sign-in link. Hiding it from
  // anonymous visitors is cosmetic only; the middleware and the Server Action
  // are what actually protect the route.
  const allLinks: { href: string; label: DictionaryKey }[] = isAdmin
    ? [
        ...links,
        { href: '/unit', label: 'unit.title' },
        { href: '/callings', label: 'callings.title' },
      ]
    : [...links, { href: '/login', label: 'nav.signIn' }];

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
                {t(link.label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
