import type { DictionaryKey } from './i18n';
import type { Role } from './types';

export type Viewer = Role | 'anonymous';

export type NavSection = 'public' | 'admin' | 'account';

export interface NavItem {
  href: string;
  label: DictionaryKey;
  section: NavSection;
  visibleTo: readonly Viewer[];
}

const EVERYONE: readonly Viewer[] = ['anonymous', 'member', 'leader', 'admin'];

// Hiding an item is cosmetic only: the middleware, the (admin) layout and the
// Server Actions are what actually protect each route.
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'nav.home', section: 'public', visibleTo: EVERYONE },
  { href: '/meetings', label: 'nav.meetings', section: 'public', visibleTo: EVERYONE },
  { href: '/meetings/current', label: 'nav.current', section: 'public', visibleTo: EVERYONE },
  { href: '/organizations', label: 'nav.organizations', section: 'public', visibleTo: EVERYONE },
  { href: '/activities', label: 'nav.activities', section: 'public', visibleTo: EVERYONE },

  { href: '/speakers', label: 'nav.speakers', section: 'admin', visibleTo: ['admin'] },
  { href: '/callings', label: 'nav.callings', section: 'admin', visibleTo: ['admin', 'leader'] },
  { href: '/announcements', label: 'nav.announcements', section: 'admin', visibleTo: ['admin', 'leader'] },
  { href: '/photos', label: 'nav.photos', section: 'admin', visibleTo: ['admin'] },
  { href: '/users', label: 'nav.users', section: 'admin', visibleTo: ['admin'] },
  { href: '/unit', label: 'nav.unit', section: 'admin', visibleTo: ['admin'] },

  // Any signed-in role: profile photos belong to whoever is signed in.
  { href: '/profile', label: 'nav.profile', section: 'account', visibleTo: ['member', 'leader', 'admin'] },
  { href: '/login', label: 'nav.signIn', section: 'account', visibleTo: ['anonymous'] },
];

export function navFor(role: Role | null): Record<NavSection, NavItem[]> {
  const viewer: Viewer = role ?? 'anonymous';
  const sections: Record<NavSection, NavItem[]> = { public: [], admin: [], account: [] };
  for (const item of NAV_ITEMS) {
    if (item.visibleTo.includes(viewer)) sections[item.section].push(item);
  }
  return sections;
}

// The item owning a route is the one with the longest matching href, so
// /meetings/current highlights "This week" rather than "Meetings", and
// /announcements/new still highlights "Announcements". Matching runs over
// every item, not only the visible ones, so a hidden route never falls back
// to lighting up a shorter parent.
export function activeHref(pathname: string): string | null {
  let best: string | null = null;
  for (const { href } of NAV_ITEMS) {
    const matches =
      pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
    if (matches && (best === null || href.length > best.length)) best = href;
  }
  return best;
}
