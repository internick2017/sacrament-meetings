import { describe, it, expect } from 'vitest';
import { appendSpeakerLine } from './speaker-line';

describe('appendSpeakerLine', () => {
  it('adds "Name | Topic" as a new line after the existing program', () => {
    expect(appendSpeakerLine('M: Coro | Hino\n\n', ' Ana  Souza ', 'Fé')).toBe('M: Coro | Hino\nAna Souza | Fé');
  });

  it('adds just the name when there is no topic, into an empty textarea', () => {
    expect(appendSpeakerLine('', 'Ana Souza', '  ')).toBe('Ana Souza');
  });

  it('leaves the text alone when the name is blank', () => {
    expect(appendSpeakerLine('Ana Souza', '  ', 'Fé')).toBe('Ana Souza');
  });

  it('keeps a pipe in the input from splitting the line', () => {
    expect(appendSpeakerLine('', 'Ana | Souza', 'Fé | esperança')).toBe('Ana Souza | Fé esperança');
  });
});
