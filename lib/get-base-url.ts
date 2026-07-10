// Server Components calling this app's own API routes need an absolute URL --
// relative fetch('/api/...') does not work from server-side code. Vercel sets
// VERCEL_URL automatically on every deployment; locally we fall back to the
// dev server's address.
export function getBaseUrl(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}
