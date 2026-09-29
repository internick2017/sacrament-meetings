import { describe, it, expect } from 'vitest';
import { activeHref, navFor } from './nav';

const hrefs = (items: { href: string }[]) => items.map((item) => item.href);

describe('navFor', () => {
  it('shows an anonymous visitor the public pages and the sign-in link only', () => {
    const nav = navFor(null);
    expect(hrefs(nav.public)).toEqual([
      '/',
      '/meetings',
      '/meetings/current',
      '/organizations',
      '/activities',
    ]);
    expect(nav.admin).toEqual([]);
    expect(hrefs(nav.account)).toEqual(['/login']);
  });

  it('gives a member no admin section, only the profile', () => {
    const nav = navFor('member');
    expect(nav.admin).toEqual([]);
    expect(hrefs(nav.account)).toEqual(['/profile']);
  });

  it('gives a leader only callings and announcements', () => {
    expect(hrefs(navFor('leader').admin)).toEqual(['/callings', '/announcements']);
  });

  it('gives an admin every admin page, speakers included', () => {
    expect(hrefs(navFor('admin').admin).sort()).toEqual(
      ['/announcements', '/callings', '/photos', '/speakers', '/unit', '/users'].sort()
    );
    expect(hrefs(navFor('admin').account)).toEqual(['/profile']);
  });
});

describe('activeHref', () => {
  it.each([
    ['/', '/'],
    ['/meetings', '/meetings'],
    ['/meetings/current', '/meetings/current'],
    ['/meetings/42', '/meetings'],
    ['/announcements/new', '/announcements'],
    ['/speakers', '/speakers'],
    ['/login', '/login'],
  ])('%s belongs to %s', (pathname, expected) => {
    expect(activeHref(pathname)).toBe(expected);
  });

  it('does not light up the home link on an unlisted route', () => {
    expect(activeHref('/nowhere')).toBeNull();
  });
});
