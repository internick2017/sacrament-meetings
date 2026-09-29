// Appends one speaker to the meeting form's speakers textarea, in the
// "Name | Topic" format that parseProgram in meetings-schema reads back.
// A "|" inside the name or topic would split the line in the wrong place.
export function appendSpeakerLine(text: string, name: string, topic: string): string {
  const clean = (value: string) => value.replaceAll('|', ' ').replace(/\s+/g, ' ').trim();
  const cleanName = clean(name);
  if (!cleanName) return text;
  const cleanTopic = clean(topic);
  const line = cleanTopic ? `${cleanName} | ${cleanTopic}` : cleanName;
  const existing = text.replace(/\s+$/, '');
  return existing ? `${existing}\n${line}` : line;
}
