import { describe, expect, it } from 'vitest';
import { interviewMessage, normalizePhone, whatsappUrl } from './interview-message';

describe('normalizePhone', () => {
  it('adds 55 to 11-digit numbers with formatting', () => {
    expect(normalizePhone('(46) 99123-4567')).toBe('5546991234567');
  });
  it('adds 55 to 10-digit numbers', () => {
    expect(normalizePhone('46 3523-4567')).toBe('554635234567');
  });
  it('accepts +55 with spaces and hyphens', () => {
    expect(normalizePhone('+55 46 99123-4567')).toBe('5546991234567');
  });
  it('keeps 12 and 13 digit numbers already starting with 55', () => {
    expect(normalizePhone('554635234567')).toBe('554635234567');
    expect(normalizePhone('5546991234567')).toBe('5546991234567');
  });
  it('returns null for empty, null, letters-only', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
  });
  it('returns null when too short or too long', () => {
    expect(normalizePhone('123456789')).toBeNull();
    expect(normalizePhone('12345678901234')).toBeNull();
  });
  it('returns null for 12/13 digits not starting with 55', () => {
    expect(normalizePhone('441234567890')).toBeNull();
  });
});

describe('interviewMessage', () => {
  const base = {
    startsAt: '2026-10-25T17:00:00.000Z',
    timeZone: 'America/Sao_Paulo',
    onlineLink: null,
  };

  it('tithing in person addresses the family and mentions the chapel', () => {
    expect(
      interviewMessage({ ...base, name: 'Silva', kind: 'tithing', mode: 'in_person' }),
    ).toBe(
      'Olá, Família Silva! O Bispo os espera para a entrevista de dízimo no domingo, 25 de outubro, às 14:00, na capela.',
    );
  });

  it('individual in person addresses the person', () => {
    expect(
      interviewMessage({ ...base, name: 'Maria Souza', kind: 'individual', mode: 'in_person' }),
    ).toBe(
      'Olá, Maria Souza! O Bispo o(a) espera para a entrevista no domingo, 25 de outubro, às 14:00, na capela.',
    );
  });

  it('online appends the meeting link', () => {
    expect(
      interviewMessage({
        ...base,
        name: 'Silva',
        kind: 'tithing',
        mode: 'online',
        onlineLink: 'https://meet.example.com/abc',
      }),
    ).toBe(
      'Olá, Família Silva! O Bispo os espera para a entrevista de dízimo no domingo, 25 de outubro, às 14:00, por videochamada: https://meet.example.com/abc',
    );
  });

  it('uses "na" for a -feira weekday', () => {
    expect(
      interviewMessage({
        ...base,
        startsAt: '2026-10-26T22:00:00.000Z',
        name: 'Silva',
        kind: 'tithing',
        mode: 'in_person',
      }),
    ).toContain('na segunda-feira, 26 de outubro, às 19:00');
  });

  it('pins the zone: 17:00Z is 14:00 in Sao Paulo', () => {
    expect(
      interviewMessage({ ...base, name: 'Silva', kind: 'tithing', mode: 'in_person' }),
    ).toContain('às 14:00');
  });
});

describe('whatsappUrl', () => {
  it('builds a wa.me link with encoded text', () => {
    expect(whatsappUrl('(46) 99123-4567', 'Olá, tudo bem?')).toBe(
      `https://wa.me/5546991234567?text=${encodeURIComponent('Olá, tudo bem?')}`,
    );
  });
  it('returns null without a valid phone', () => {
    expect(whatsappUrl(null, 'x')).toBeNull();
    expect(whatsappUrl('abc', 'x')).toBeNull();
  });
});
