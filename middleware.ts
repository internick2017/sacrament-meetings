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
  // lib/auth.ts pulls in nodemailer (magic links over Gmail), which needs
  // Node's stream module. The default edge runtime cannot load it and every
  // protected route answered 500, so the middleware runs on Node instead.
  runtime: 'nodejs',
  matcher: [
    '/meetings/new',
    '/meetings/:id/edit',
    '/unit',
    '/callings',
    '/users',
    '/speakers',
    '/photos',
    '/profile',
    '/activities/new',
    '/activities/:id/edit',
    '/announcements',
    '/announcements/new',
    '/announcements/:id/edit',
  ],
};
