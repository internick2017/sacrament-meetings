import { describe, it, expect } from 'vitest';
import { needsApproval } from './photo-rules';

describe('needsApproval', () => {
  // The whole point: a photo from a children's or youth activity is not
  // published by whoever took it.
  it('requires approval for Primary', () => {
    expect(needsApproval('primary')).toBe(true);
  });

  it('requires approval for Young Men', () => {
    expect(needsApproval('young_men')).toBe(true);
  });

  it('requires approval for Young Women', () => {
    expect(needsApproval('young_women')).toBe(true);
  });

  it('does not require approval for adult organizations', () => {
    expect(needsApproval('relief_society')).toBe(false);
    expect(needsApproval('elders_quorum')).toBe(false);
    expect(needsApproval('sunday_school')).toBe(false);
    expect(needsApproval('bishopric')).toBe(false);
  });

  // A unit-wide activity has no organization. Children are present at unit-wide
  // activities too, so this fails SAFE: approval is required.
  it('requires approval when there is no organization at all', () => {
    expect(needsApproval(null)).toBe(true);
  });

  // An organization key the code does not recognise must not slip through as
  // "no approval needed".
  it('requires approval for an unknown organization', () => {
    expect(needsApproval('choir' as never)).toBe(true);
  });
});
