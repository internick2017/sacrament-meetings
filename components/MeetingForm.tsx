import { useRef, useState } from 'react';
import Link from 'next/link';
import type { ProgramItem, SacramentMeeting } from '@/lib/types';
import type { MeetingFormState } from '@/lib/actions';
import type { MeetingFormValues } from '@/lib/meetings-schema';
import { useT } from '@/lib/i18n/client';
import type { DictionaryKey } from '@/lib/i18n';
import { appendSpeakerLine } from '@/lib/speaker-line';
import SpeakerPicker from './SpeakerPicker';

interface MeetingFormProps {
  // The formAction returned by useActionState in the parent client component.
  action: (formData: FormData) => void;
  state: MeetingFormState;
  isPending: boolean;
  // Dictionary key for the submit button, so the label follows the language.
  submitLabel: DictionaryKey;
  // Present when editing: pre-fills every field.
  defaultMeeting?: SacramentMeeting;
  // The ward roster, offered as suggestions when adding a speaker.
  memberNames: string[];
}

const MEETING_TYPE_OPTIONS: {
  value: SacramentMeeting['meetingType'];
  label: DictionaryKey;
}[] = [
  { value: 'regular', label: 'meetingType.regular' },
  { value: 'testimony', label: 'meetingType.testimony' },
  { value: 'stake', label: 'meetingType.stake' },
  { value: 'general', label: 'meetingType.general' },
  { value: 'special', label: 'meetingType.special' },
];

// Turn the stored program back into the textarea format the form accepts:
// speakers as "Name | Topic", musical numbers as "M: Performer | Title".
function programToText(program: ProgramItem[]): string {
  return program
    .map((item) =>
      item.type === 'speaker'
        ? `${item.name} | ${item.topic}`
        : `M: ${item.performer}${item.title ? ` | ${item.title}` : ''}`
    )
    .join('\n');
}

// The stored meeting as form values. An undecided (null) field is a blank input.
function meetingToValues(m: SacramentMeeting | undefined): MeetingFormValues {
  return {
    date: m?.date ?? '',
    meetingType: m?.meetingType ?? 'regular',
    presiding: m?.presiding ?? '',
    conducting: m?.conducting ?? '',
    openingHymnNumber: m?.openingHymn ? String(m.openingHymn.number) : '',
    openingHymnTitle: m?.openingHymn?.title ?? '',
    openingPrayer: m?.openingPrayer ?? '',
    sacramentHymnNumber: m?.sacramentHymn ? String(m.sacramentHymn.number) : '',
    sacramentHymnTitle: m?.sacramentHymn?.title ?? '',
    closingHymnNumber: m?.closingHymn ? String(m.closingHymn.number) : '',
    closingHymnTitle: m?.closingHymn?.title ?? '',
    closingPrayer: m?.closingPrayer ?? '',
    stakeBusiness: m?.stakeBusiness ? 'on' : 'off',
    announcements: m?.announcements?.join('\n') ?? '',
    wardBusiness: m?.wardBusiness.map((item) => item.description).join('\n') ?? '',
    speakers: m ? programToText(m.program) : '',
  };
}

const inputClass =
  'w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400';

export default function MeetingForm({
  action,
  state,
  isPending,
  submitLabel,
  defaultMeeting,
  memberNames,
}: MeetingFormProps) {
  const t = useT();
  const speakersRef = useRef<HTMLTextAreaElement>(null);
  const errors = state.errors ?? {};

  // Same remount-by-key pattern as EventForm.tsx: React reuses uncontrolled
  // inputs across submissions, so the echoed values only show after a remount.
  const [formInstance, setFormInstance] = useState(0);
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    setFormInstance((n) => n + 1);
  }

  const v = state.values ?? meetingToValues(defaultMeeting);

  // A field's error paragraph is always rendered (empty when valid) so its id is
  // a stable aria-describedby target and screen readers announce it when it fills.
  function fieldError(name: string) {
    return (
      <p id={`${name}-error`} aria-live="polite" className="min-h-5 text-sm text-red-600">
        {errors[name]?.[0]}
      </p>
    );
  }

  return (
    <form key={formInstance} action={action} className="max-w-2xl space-y-5">
      {state.message && (
        <p role="alert" aria-live="polite" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <p className="text-sm text-slate-600">{t('form.optionalHint')}</p>

      <div>
        <label htmlFor="date" className="mb-1 block text-sm font-semibold">{t('form.date')}</label>
        <input id="date" name="date" type="date" defaultValue={v.date} aria-describedby="date-error" className={inputClass} />
        {fieldError('date')}
      </div>

      <div>
        <label htmlFor="meetingType" className="mb-1 block text-sm font-semibold">{t('form.meetingType')}</label>
        <select id="meetingType" name="meetingType" defaultValue={v.meetingType} aria-describedby="meetingType-error" className={inputClass}>
          {MEETING_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{t(option.label)}</option>
          ))}
        </select>
        {fieldError('meetingType')}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="presiding" className="mb-1 block text-sm font-semibold">{t('form.presiding')}</label>
          <input id="presiding" name="presiding" type="text" defaultValue={v.presiding} aria-describedby="presiding-error" className={inputClass} />
          {fieldError('presiding')}
        </div>
        <div>
          <label htmlFor="conducting" className="mb-1 block text-sm font-semibold">{t('form.conducting')}</label>
          <input id="conducting" name="conducting" type="text" defaultValue={v.conducting} aria-describedby="conducting-error" className={inputClass} />
          {fieldError('conducting')}
        </div>
      </div>

      <fieldset className="space-y-3 rounded border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold">{t('form.openingHymn')}</legend>
        <div className="grid gap-5 sm:grid-cols-[8rem_1fr]">
          <div>
            <label htmlFor="openingHymnNumber" className="mb-1 block text-sm font-semibold">{t('form.hymnNumber')}</label>
            <input id="openingHymnNumber" name="openingHymnNumber" type="number" min={1} defaultValue={v.openingHymnNumber} aria-describedby="openingHymnNumber-error" className={inputClass} />
            {fieldError('openingHymnNumber')}
          </div>
          <div>
            <label htmlFor="openingHymnTitle" className="mb-1 block text-sm font-semibold">{t('form.hymnTitle')}</label>
            <input id="openingHymnTitle" name="openingHymnTitle" type="text" defaultValue={v.openingHymnTitle} aria-describedby="openingHymnTitle-error" className={inputClass} />
            {fieldError('openingHymnTitle')}
          </div>
        </div>
      </fieldset>

      <div>
        <label htmlFor="openingPrayer" className="mb-1 block text-sm font-semibold">{t('form.openingPrayer')}</label>
        <input id="openingPrayer" name="openingPrayer" type="text" defaultValue={v.openingPrayer} aria-describedby="openingPrayer-error" className={inputClass} />
        {fieldError('openingPrayer')}
      </div>

      <fieldset className="space-y-3 rounded border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold">{t('form.sacramentHymn')}</legend>
        <div className="grid gap-5 sm:grid-cols-[8rem_1fr]">
          <div>
            <label htmlFor="sacramentHymnNumber" className="mb-1 block text-sm font-semibold">{t('form.hymnNumber')}</label>
            <input id="sacramentHymnNumber" name="sacramentHymnNumber" type="number" min={1} defaultValue={v.sacramentHymnNumber} aria-describedby="sacramentHymnNumber-error" className={inputClass} />
            {fieldError('sacramentHymnNumber')}
          </div>
          <div>
            <label htmlFor="sacramentHymnTitle" className="mb-1 block text-sm font-semibold">{t('form.hymnTitle')}</label>
            <input id="sacramentHymnTitle" name="sacramentHymnTitle" type="text" defaultValue={v.sacramentHymnTitle} aria-describedby="sacramentHymnTitle-error" className={inputClass} />
            {fieldError('sacramentHymnTitle')}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold">{t('form.closingHymn')}</legend>
        <div className="grid gap-5 sm:grid-cols-[8rem_1fr]">
          <div>
            <label htmlFor="closingHymnNumber" className="mb-1 block text-sm font-semibold">{t('form.hymnNumber')}</label>
            <input id="closingHymnNumber" name="closingHymnNumber" type="number" min={1} defaultValue={v.closingHymnNumber} aria-describedby="closingHymnNumber-error" className={inputClass} />
            {fieldError('closingHymnNumber')}
          </div>
          <div>
            <label htmlFor="closingHymnTitle" className="mb-1 block text-sm font-semibold">{t('form.hymnTitle')}</label>
            <input id="closingHymnTitle" name="closingHymnTitle" type="text" defaultValue={v.closingHymnTitle} aria-describedby="closingHymnTitle-error" className={inputClass} />
            {fieldError('closingHymnTitle')}
          </div>
        </div>
      </fieldset>

      <div>
        <label htmlFor="closingPrayer" className="mb-1 block text-sm font-semibold">{t('form.closingPrayer')}</label>
        <input id="closingPrayer" name="closingPrayer" type="text" defaultValue={v.closingPrayer} aria-describedby="closingPrayer-error" className={inputClass} />
        {fieldError('closingPrayer')}
      </div>

      <div className="flex items-center gap-2">
        <input id="stakeBusiness" name="stakeBusiness" type="checkbox" defaultChecked={v.stakeBusiness === 'on'} className="h-4 w-4" />
        <label htmlFor="stakeBusiness" className="text-sm font-semibold">{t('form.stakeBusiness')}</label>
      </div>

      <div>
        <label htmlFor="announcements" className="mb-1 block text-sm font-semibold">{t('form.announcements')}</label>
        <textarea id="announcements" name="announcements" rows={3} defaultValue={v.announcements} className={inputClass} />
        <p className="mt-1 text-xs text-slate-500">{t('form.announcementsHint')}</p>
      </div>

      <div>
        <label htmlFor="wardBusiness" className="mb-1 block text-sm font-semibold">{t('form.wardBusiness')}</label>
        <textarea id="wardBusiness" name="wardBusiness" rows={3} defaultValue={v.wardBusiness} className={inputClass} />
        <p className="mt-1 text-xs text-slate-500">{t('form.wardBusinessHint')}</p>
      </div>

      <div>
        <label htmlFor="speakers" className="mb-1 block text-sm font-semibold">{t('form.speakers')}</label>
        <textarea ref={speakersRef} id="speakers" name="speakers" rows={4} defaultValue={v.speakers} className={inputClass} />
        <p className="mt-1 text-xs text-slate-500">
          {t('form.speakersHintPrefix')} <code>Name | Topic</code>. {t('form.speakersHintMusical')}{' '}
          <code>M: Performer | Title</code>.
        </p>
        <SpeakerPicker
          memberNames={memberNames}
          onAdd={(name, topic) => {
            const textarea = speakersRef.current;
            if (textarea) textarea.value = appendSpeakerLine(textarea.value, name, topic);
          }}
        />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">
          {isPending ? t('form.saving') : t(submitLabel)}
        </button>
        <Link href="/meetings" className="text-sm text-slate-600 underline">{t('form.cancel')}</Link>
      </div>
    </form>
  );
}
