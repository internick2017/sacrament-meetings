import { describe, it, expect } from 'vitest';
import { parseRosterText } from './members-schema';

describe('parseRosterText', () => {
  it('trims, collapses spaces, drops blank lines and case-insensitive duplicates', () => {
    expect(parseRosterText('  Ana   Souza \r\n\n ana souza\nBruno Alves\n   \n')).toEqual({
      ok: true,
      names: ['Ana Souza', 'Bruno Alves'],
    });
  });

  it('accepts an empty list, which clears the roster', () => {
    expect(parseRosterText('\n  \n')).toEqual({ ok: true, names: [] });
  });

  it('rejects more than 1000 names', () => {
    const text = Array.from({ length: 1001 }, (_, i) => `Pessoa ${i}`).join('\n');
    expect(parseRosterText(text)).toEqual({ ok: false, error: 'tooMany' });
  });

  it('rejects a name longer than 120 characters', () => {
    expect(parseRosterText(`Ana\n${'a'.repeat(121)}`)).toEqual({ ok: false, error: 'tooLong' });
    expect(parseRosterText('a'.repeat(120))).toEqual({ ok: true, names: ['a'.repeat(120)] });
  });
});
