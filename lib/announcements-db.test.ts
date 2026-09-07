import { describe, it, expect } from 'vitest';
import { currentFilter } from './announcements-db';

describe('currentFilter', () => {
  it('excludes announcements that have already expired', () => {
    expect(currentFilter()).toContain('ends_on >= CURRENT_DATE');
  });

  it('excludes announcements that have not started yet', () => {
    expect(currentFilter()).toContain('starts_on');
    expect(currentFilter()).toContain('CURRENT_DATE');
  });

  // The filter is concatenated into SQL, so it must never be able to carry a
  // value. It takes no arguments and returns a constant.
  it('takes no arguments and returns a constant string', () => {
    expect(currentFilter.length).toBe(0);
    expect(currentFilter()).toBe(currentFilter());
    expect(currentFilter()).not.toMatch(/[$;]/);
  });
});
