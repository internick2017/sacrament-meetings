'use client';

import { useId, useState, type KeyboardEvent } from 'react';
import { useT } from '@/lib/i18n/client';

interface SpeakerPickerProps {
  memberNames: string[];
  onAdd: (name: string, topic: string) => void;
}

const inputClass =
  'w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400';

// Picking from the roster keeps a speaker's name spelled the same way every
// time. Any other name is still accepted, for visitors. The inputs have no
// name attribute, so they never reach the meeting's form data.
export default function SpeakerPicker({ memberNames, onAdd }: SpeakerPickerProps) {
  const t = useT();
  const id = useId();
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');

  function add() {
    if (!name.trim()) return;
    onAdd(name, topic);
    setName('');
    setTopic('');
  }

  // Enter inside the meeting form would otherwise submit the whole meeting.
  function addOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      add();
    }
  }

  return (
    <div className="mt-2 grid gap-2 rounded border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div>
        <label htmlFor={`${id}-name`} className="mb-1 block text-xs font-semibold">{t('form.speakerPicker.name')}</label>
        <input
          id={`${id}-name`}
          type="text"
          list={`${id}-members`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={addOnEnter}
          placeholder={t('form.speakerPicker.namePlaceholder')}
          autoComplete="off"
          className={inputClass}
        />
        <datalist id={`${id}-members`}>
          {memberNames.map((memberName) => (
            <option key={memberName} value={memberName} />
          ))}
        </datalist>
      </div>
      <div>
        <label htmlFor={`${id}-topic`} className="mb-1 block text-xs font-semibold">{t('form.speakerPicker.topic')}</label>
        <input
          id={`${id}-topic`}
          type="text"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          onKeyDown={addOnEnter}
          className={inputClass}
        />
      </div>
      <button
        type="button"
        onClick={add}
        className="rounded border border-slate-400 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-100"
      >
        {t('form.speakerPicker.add')}
      </button>
    </div>
  );
}
