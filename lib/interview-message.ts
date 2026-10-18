import type { InterviewKind, InterviewMode } from './interviews-rules';

/** Digits only; Brazilian numbers get the 55 prefix. Returns null if unusable. */
export function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  // Drop a single national trunk zero (e.g. "046 3523-4567") before measuring.
  const digits = raw.replace(/\D/g, '').replace(/^0/, '');
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return digits;
  }
  return null;
}

export type InterviewMessageInput = {
  name: string;
  kind: InterviewKind;
  startsAt: string;
  timeZone: string;
  mode: InterviewMode;
  onlineLink: string | null;
};

export function interviewMessage(input: InterviewMessageInput): string {
  const date = new Date(input.startsAt);
  const day = new Intl.DateTimeFormat('pt-BR', {
    timeZone: input.timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
  const time = new Intl.DateTimeFormat('pt-BR', {
    timeZone: input.timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);

  const tithing = input.kind === 'tithing';
  const greeting = tithing ? `Olá, Família ${input.name}!` : `Olá, ${input.name}!`;
  const who = tithing
    ? 'O Bispo os espera para a entrevista de dízimo'
    : 'O Bispo o(a) espera para a entrevista';
  const where =
    input.mode === 'online' && input.onlineLink
      ? `por videochamada: ${input.onlineLink}`
      : 'na capela.';

  // sábado/domingo are masculine ("no"); the *-feira weekdays are feminine ("na").
  const article = day.includes('-feira') ? 'na' : 'no';

  return `${greeting} ${who} ${article} ${day}, às ${time}, ${where}`;
}

export function whatsappUrl(phone: string | null, message: string): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
