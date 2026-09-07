import { auth } from '@/lib/auth';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  if (!isLoggedIn) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: [
    '/meetings/new',
    '/meetings/:id/edit',
    '/unit',
    '/callings',
    '/users',
    '/activities/new',
    '/activities/:id/edit',
    '/announcements',
    '/announcements/new',
    '/announcements/:id/edit',
  ],
};
