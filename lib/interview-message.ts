import { INTERVIEWERS, type InterviewerKey, type InterviewKind, type InterviewMode } from './interviews-rules';
import { normalizePhone } from './phone';

export { normalizePhone };

export type InterviewMessageInput = {
  name: string;
  kind: InterviewKind;
  startsAt: string;
  timeZone: string;
  mode: InterviewMode;
  onlineLink: string | null;
  interviewer: InterviewerKey;
};

// Nick is the bishop; the other interviewers are his counselors, named by
// their first name.
function interviewerTitle(key: InterviewerKey): string {
  if (key === 'nick') return 'O Bispo';
  const name = INTERVIEWERS.find((interviewer) => interviewer.key === key)?.name ?? key;
  return `O Conselheiro ${name.split(' ')[0]}`;
}

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
  const title = interviewerTitle(input.interviewer);
  const who = tithing
    ? `${title} os espera para a entrevista de dízimo`
    : `${title} o(a) espera para a entrevista`;
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
