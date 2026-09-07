import { describe, it, expect } from 'vitest';
import { audienceFilter } from './events-db';

describe('audienceFilter', () => {
  it('restricts an anonymous visitor to public activities', () => {
    expect(audienceFilter(false)).toContain("audience = 'public'");
  });

  it('does not restrict a signed-in visitor', () => {
    expect(audienceFilter(true)).toBe('TRUE');
  });

  // The filter is concatenated into SQL, so it must never be able to carry a
  // value. It takes a boolean and returns one of two fixed strings: there is no
  // input that could reach the query.
  it('returns one of exactly two constant strings', () => {
    const outputs = new Set([audienceFilter(true), audienceFilter(false)]);
    expect(outputs.size).toBe(2);
    for (const value of outputs) {
      expect(value).toMatch(/^[A-Za-z' =]+$/);
    }
  });
});
