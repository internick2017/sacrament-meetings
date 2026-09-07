import { describe, it, expect } from 'vitest';
import { safeCallbackUrl, DEFAULT_REDIRECT } from './safe-redirect';

describe('safeCallbackUrl', () => {
  it('keeps a same-app relative path', () => {
    expect(safeCallbackUrl('/callings')).toBe('/callings');
    expect(safeCallbackUrl('/activities/6/edit')).toBe('/activities/6/edit');
  });

  it('keeps a relative path that carries a query string', () => {
    expect(safeCallbackUrl('/meetings?page=2')).toBe('/meetings?page=2');
  });

  it('refuses an absolute URL to another site', () => {
    expect(safeCallbackUrl('https://evil.example/steal')).toBe(DEFAULT_REDIRECT);
    expect(safeCallbackUrl('http://evil.example')).toBe(DEFAULT_REDIRECT);
  });

  // The one that looks relative and is not: a browser reads a leading double
  // slash as protocol-relative, so `//evil.example` leaves the site.
  it('refuses a protocol-relative URL', () => {
    expect(safeCallbackUrl('//evil.example')).toBe(DEFAULT_REDIRECT);
    expect(safeCallbackUrl('//evil.example/path')).toBe(DEFAULT_REDIRECT);
  });

  it('refuses a javascript: URL', () => {
    expect(safeCallbackUrl('javascript:alert(1)')).toBe(DEFAULT_REDIRECT);
  });

  it('falls back for anything that is not a string', () => {
    expect(safeCallbackUrl(null)).toBe(DEFAULT_REDIRECT);
    expect(safeCallbackUrl(undefined)).toBe(DEFAULT_REDIRECT);
    expect(safeCallbackUrl(['/meetings'])).toBe(DEFAULT_REDIRECT);
    expect(safeCallbackUrl(42)).toBe(DEFAULT_REDIRECT);
  });

  it('falls back for an empty string', () => {
    expect(safeCallbackUrl('')).toBe(DEFAULT_REDIRECT);
  });
});
