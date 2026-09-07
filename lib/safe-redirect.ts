// Where the app is allowed to send someone after a successful sign-in, or
// instead of showing the login page to someone who is already signed in.
//
// The value always comes from the query string or a form field, which means it
// comes from whoever wrote the link — not from us. Without this check, a link
// like /login?callbackUrl=https://evil.example could bounce a member off-site
// straight after they authenticate, on a page they had every reason to trust.
//
// Only a same-app relative path is accepted. `//evil.example` is rejected on
// purpose: the browser reads a leading double slash as a protocol-relative
// URL, so it looks relative and is not.
export const DEFAULT_REDIRECT = '/meetings';

export function safeCallbackUrl(value: unknown): string {
  if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) {
    return value;
  }
  return DEFAULT_REDIRECT;
}
