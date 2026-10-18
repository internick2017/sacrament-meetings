'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { useLocale, useT } from '@/lib/i18n/client';
import { formatEventDateTime } from '@/lib/i18n';
import {
  rescheduleInterviewAction,
  scheduleInterviewAction,
  type InterviewFormState,
} from '@/lib/interviews-actions';
import { INTERVIEWERS, type Interview, type InterviewKind, type InterviewMode } from '@/lib/interviews-rules';
import { isValidLocalDateTime } from '@/lib/interviews-schema';
import { interviewMessage } from '@/lib/interview-message';
import { zonedLocalToInstant } from '@/lib/timezone';
import WhatsappButton from './WhatsappButton';

const INPUT = 'w-full rounded border border-slate-300 px-3 py-2';

export interface FormMember {
  id: number;
  fullName: string;
  isHead: boolean;
  phone: string | null;
}

export interface InterviewFormInitial {
  memberId: number | null;
  kind: InterviewKind;
  interviewer: Interview['interviewer'];
  startsLocal: string;
  durationMinutes: number;
  mode: InterviewMode;
  onlineLink: string;
}

interface InterviewFormProps {
  members: FormMember[];
  timeZone: string;
  initial: InterviewFormInitial;
  // Present when moving an existing scheduled interview: member and kind are
  // then fixed (the action reads them from the stored interview anyway).
  rescheduleId?: number;
}

// "Schedule another" remounts the inner form, which is the only way to reset
// the useActionState result back to empty.
export default function InterviewForm(props: InterviewFormProps) {
  const [round, setRound] = useState(0);
  return <InterviewFormInner key={round} {...props} onAnother={() => setRound((n) => n + 1)} />;
}

function InterviewFormInner({
  members,
  timeZone,
  initial,
  rescheduleId,
  onAnother,
}: InterviewFormProps & { onAnother: () => void }) {
  const t = useT();
  const locale = useLocale();
  const action = rescheduleId ? rescheduleInterviewAction : scheduleInterviewAction;
  const [state, formAction, pending] = useActionState<InterviewFormState, FormData>(action, {});

  // Controlled fields: a rejected submit keeps what was typed without the
  // remount trick the uncontrolled forms need, and the WhatsApp preview
  // follows every change.
  const [memberId, setMemberId] = useState(initial.memberId === null ? '' : String(initial.memberId));
  const [kind, setKind] = useState<InterviewKind>(initial.kind);
  const [interviewer, setInterviewer] = useState(initial.interviewer);
  const [startsLocal, setStartsLocal] = useState(initial.startsLocal);
  const [duration, setDuration] = useState(String(initial.durationMinutes));
  const [mode, setMode] = useState<InterviewMode>(initial.mode);
  const [onlineLink, setOnlineLink] = useState(initial.onlineLink);
  const member = members.find((candidate) => String(candidate.id) === memberId) ?? null;
  const [phone, setPhone] = useState(member?.phone ?? '');

  const tithing = kind === 'tithing';
  const effectiveInterviewer = tithing ? 'nick' : interviewer;

  const message =
    member && isValidLocalDateTime(startsLocal)
      ? interviewMessage({
          name: member.fullName,
          kind,
          startsAt: zonedLocalToInstant(startsLocal, timeZone),
          timeZone,
          mode,
          onlineLink: mode === 'online' ? onlineLink.trim() || null : null,
        })
      : null;

  const nameOf = (id: number) => members.find((candidate) => candidate.id === id)?.fullName ?? '';
  const interviewerName = (key: Interview['interviewer']) =>
    INTERVIEWERS.find((candidate) => candidate.key === key)?.name ?? key;

  function fieldError(name: string) {
    return (
      <p id={`${name}-error`} aria-live="polite" className="min-h-5 text-sm text-red-600">
        {state.errors?.[name]?.[0]}
      </p>
    );
  }

  if (state.saved) {
    const conflicts = state.conflicts ?? [];
    return (
      <div className="max-w-xl space-y-4">
        <p role="status" className="rounded bg-green-50 px-3 py-2 text-sm text-green-900">
          {state.message}
        </p>
        {conflicts.length > 0 && (
          <div role="alert" className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p className="font-semibold">{t('interviews.conflicts.title')}</p>
            <ul className="list-disc pl-5">
              {conflicts.map((other) => (
                <li key={other.id}>
                  {formatEventDateTime(other.startsAt, false, locale, timeZone)}, {nameOf(other.memberId)} (
                  {interviewerName(other.interviewer)})
                </li>
              ))}
            </ul>
          </div>
        )}
        {message && (
          <section aria-labelledby="saved-message-heading" className="space-y-2">
            <h2 id="saved-message-heading" className="font-semibold">
              {t('interviews.form.preview')}
            </h2>
            <WhatsappButton phone={phone} message={message} />
          </section>
        )}
        <div className="flex flex-wrap gap-3">
          <Link href="/interviews" className="rounded bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-700">
            {t('interviews.form.back')}
          </Link>
          {!rescheduleId && (
            <button
              type="button"
              onClick={onAnother}
              className="rounded border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t('interviews.form.another')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {rescheduleId && <input type="hidden" name="id" value={rescheduleId} />}

      {state.message && (
        <p role="alert" aria-live="polite" className="rounded bg-slate-100 px-3 py-2 text-sm">
          {state.message}
        </p>
      )}

      {rescheduleId ? (
        <div className="space-y-1">
          <p className="font-semibold">{t('interviews.form.member')}</p>
          <p>
            {member?.fullName} · {t(`interviews.kind.${kind}`)}
          </p>
          <input type="hidden" name="memberId" value={memberId} />
          <input type="hidden" name="kind" value={kind} />
        </div>
      ) : (
        <>
          <label className="block space-y-1">
            <span className="font-semibold">{t('interviews.form.member')}</span>
            <select
              name="memberId"
              value={memberId}
              onChange={(event) => {
                const next = members.find((candidate) => String(candidate.id) === event.target.value);
                setMemberId(event.target.value);
                setPhone(next?.phone ?? '');
              }}
              aria-describedby="memberId-error"
              required
              className={INPUT}
            >
              <option value="">{t('interviews.form.memberPlaceholder')}</option>
              {members.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.fullName}
                  {candidate.isHead ? ` ${t('interviews.form.headSuffix')}` : ''}
                </option>
              ))}
            </select>
            {fieldError('memberId')}
          </label>

          <fieldset className="space-y-1">
            <legend className="font-semibold">{t('interviews.form.kind')}</legend>
            <div className="flex flex-wrap gap-4">
              {(['tithing', 'individual'] as const).map((option) => (
                <label key={option} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="kind"
                    value={option}
                    checked={kind === option}
                    onChange={() => setKind(option)}
                  />
                  {t(`interviews.kind.${option}`)}
                </label>
              ))}
            </div>
            {fieldError('kind')}
          </fieldset>
        </>
      )}

      <label className="block space-y-1">
        <span className="font-semibold">{t('interviews.form.interviewer')}</span>
        {/* A disabled select is not submitted, so a tithing interview sends
            Nick through a hidden field. The server enforces it regardless. */}
        {tithing && <input type="hidden" name="interviewer" value="nick" />}
        <select
          name={tithing ? undefined : 'interviewer'}
          value={effectiveInterviewer}
          disabled={tithing}
          onChange={(event) => setInterviewer(event.target.value as Interview['interviewer'])}
          aria-describedby="interviewer-hint interviewer-error"
          className={`${INPUT} disabled:bg-slate-100`}
        >
          {INTERVIEWERS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.name}
            </option>
          ))}
        </select>
        {tithing && (
          <span id="interviewer-hint" className="block text-sm text-slate-500">
            {t('interviews.form.interviewerFixed')}
          </span>
        )}
        {fieldError('interviewer')}
      </label>

      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <label className="block space-y-1">
          <span className="font-semibold">{t('interviews.form.startsAt')}</span>
          <input
            type="datetime-local"
            name="startsLocal"
            value={startsLocal}
            onChange={(event) => setStartsLocal(event.target.value)}
            aria-describedby="startsLocal-error"
            required
            className={INPUT}
          />
          {fieldError('startsLocal')}
        </label>
        <label className="block space-y-1">
          <span className="font-semibold">{t('interviews.form.duration')}</span>
          <input
            type="number"
            name="durationMinutes"
            min={1}
            max={240}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            aria-describedby="durationMinutes-error"
            className={INPUT}
          />
          {fieldError('durationMinutes')}
        </label>
      </div>

      <fieldset className="space-y-1">
        <legend className="font-semibold">{t('interviews.form.mode')}</legend>
        <div className="flex flex-wrap gap-4">
          {(['in_person', 'online'] as const).map((option) => (
            <label key={option} className="flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                value={option}
                checked={mode === option}
                onChange={() => setMode(option)}
              />
              {t(`interviews.mode.${option}`)}
            </label>
          ))}
        </div>
        {fieldError('mode')}
      </fieldset>

      {mode === 'online' && (
        <label className="block space-y-1">
          <span className="font-semibold">{t('interviews.form.onlineLink')}</span>
          <input
            type="url"
            name="onlineLink"
            value={onlineLink}
            onChange={(event) => setOnlineLink(event.target.value)}
            aria-describedby="onlineLink-error"
            required
            className={INPUT}
          />
          {fieldError('onlineLink')}
        </label>
      )}

      <label className="block space-y-1">
        <span className="font-semibold">{t('interviews.form.phone')}</span>
        <input
          type="tel"
          name="phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          autoComplete="off"
          aria-describedby="phone-hint phone-error"
          className={INPUT}
        />
        <span id="phone-hint" className="block text-sm text-slate-500">
          {t('interviews.form.phoneHint')}
        </span>
        {fieldError('phone')}
      </label>

      <section aria-labelledby="preview-heading" className="space-y-2">
        <h2 id="preview-heading" className="font-semibold">
          {t('interviews.form.preview')}
        </h2>
        {message ? (
          <WhatsappButton phone={phone} message={message} />
        ) : (
          <p className="text-sm text-slate-500">{t('interviews.form.previewPending')}</p>
        )}
      </section>

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-slate-800 px-5 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {rescheduleId ? t('interviews.form.saveReschedule') : t('interviews.form.save')}
      </button>
    </form>
  );
}
