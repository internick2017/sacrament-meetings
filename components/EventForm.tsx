'use client';

import { useActionState, useState } from 'react';
import {
  addEventAction,
  updateEventAction,
  type EventFormState,
} from '@/lib/events-actions';
import { useT } from '@/lib/i18n/client';
import { AUDIENCES, type OrganizationKey } from '@/lib/types';
import type { DictionaryKey } from '@/lib/i18n';

const INPUT = 'w-full rounded border border-slate-300 px-3 py-2';

interface EventFormProps {
  // Which organizations show in the picker, and whether the "whole unit"
  // option is offered. The activities pages pass the full set plus the
  // congregation-wide option for an admin, and just the leader's own
  // organization (no congregation-wide option) for a leader — the same
  // UI-only scoping as CallingForm.tsx. The server-side guard in
  // events-actions.ts (requireLeaderOf) still enforces this regardless of
  // what the picker offers.
  organizationKeys: readonly OrganizationKey[];
  allowBranchWide: boolean;
  // Present only when editing an existing activity.
  event?: {
    id: number;
    organizationKey: OrganizationKey | null;
    title: string;
    description: string;
    location: string;
    startsAt: string;
    endsAt: string;
    allDay: boolean;
    audience: string;
  };
}

export default function EventForm({ organizationKeys, allowBranchWide, event }: EventFormProps) {
  const t = useT();
  const action = event ? updateEventAction : addEventAction;
  const [state, formAction, pending] = useActionState<EventFormState, FormData>(action, {});

  // Same remount-by-key pattern as CallingForm.tsx and UserForm.tsx:
  // useActionState returns a new state object per submission, but React
  // reuses the existing uncontrolled input DOM nodes, so a new defaultValue
  // alone would be silently ignored without forcing a remount.
  const [formInstance, setFormInstance] = useState(0);
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    setFormInstance((n) => n + 1);
  }

  function fieldError(name: string) {
    return (
      <p id={`${name}-error`} aria-live="polite" className="min-h-5 text-sm text-red-600">
        {state.errors?.[name]?.[0]}
      </p>
    );
  }

  // The form echoes whatever the last submission sent (state.values) so a
  // failed validation does not wipe what the user typed; before any
  // submission, it falls back to the activity being edited, or blank
  // defaults for a brand-new one.
  const values = state.values ?? {
    organizationKey: event?.organizationKey ?? '',
    title: event?.title ?? '',
    description: event?.description ?? '',
    location: event?.location ?? '',
    startsAt: event?.startsAt ?? '',
    endsAt: event?.endsAt ?? '',
    allDay: event?.allDay ? 'on' : 'off',
    audience: event?.audience ?? 'public',
  };

  return (
    <form key={formInstance} action={formAction} className="max-w-xl space-y-4">
      {event && <input type="hidden" name="id" value={event.id} />}

      {state.message && (
        <p role="alert" aria-live="polite" className="rounded bg-slate-100 px-3 py-2 text-sm">
          {state.message}
        </p>
      )}

      <label className="block space-y-1">
        <span className="font-semibold">{t('activities.organization')}</span>
        <select
          name="organizationKey"
          defaultValue={values.organizationKey}
          aria-describedby="organizationKey-error"
          className={INPUT}
        >
          {allowBranchWide && <option value="">{t('activities.branchWide')}</option>}
          {organizationKeys.map((key) => (
            <option key={key} value={key}>
              {t(`organization.${key}` as DictionaryKey)}
            </option>
          ))}
        </select>
        {fieldError('organizationKey')}
      </label>

      <label className="block space-y-1">
        <span className="font-semibold">{t('activities.titleLabel')}</span>
        <input
          type="text"
          name="title"
          defaultValue={values.title}
          aria-describedby="title-error"
          className={INPUT}
        />
        {fieldError('title')}
      </label>

      <label className="block space-y-1">
        <span className="font-semibold">{t('activities.description')}</span>
        <textarea
          name="description"
          defaultValue={values.description}
          aria-describedby="description-error"
          rows={3}
          className={INPUT}
        />
        {fieldError('description')}
      </label>

      <label className="block space-y-1">
        <span className="font-semibold">{t('activities.where')}</span>
        <input
          type="text"
          name="location"
          defaultValue={values.location}
          aria-describedby="location-error"
          className={INPUT}
        />
        {fieldError('location')}
      </label>

      <label className="block space-y-1">
        <span className="font-semibold">{t('activities.from')}</span>
        <input
          type="datetime-local"
          name="startsAt"
          defaultValue={values.startsAt}
          aria-describedby="startsAt-error"
          className={INPUT}
        />
        {fieldError('startsAt')}
      </label>

      <label className="block space-y-1">
        <span className="font-semibold">{t('activities.to')}</span>
        <input
          type="datetime-local"
          name="endsAt"
          defaultValue={values.endsAt}
          aria-describedby="endsAt-error"
          className={INPUT}
        />
        {fieldError('endsAt')}
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="allDay"
          defaultChecked={values.allDay === 'on'}
          aria-describedby="allDay-error"
        />
        <span className="font-semibold">{t('activities.allDay')}</span>
      </label>
      {fieldError('allDay')}

      <label className="block space-y-1">
        <span className="font-semibold">{t('activities.audience')}</span>
        <select
          name="audience"
          defaultValue={values.audience}
          aria-describedby="audience-error"
          className={INPUT}
        >
          {AUDIENCES.map((audience) => (
            <option key={audience} value={audience}>
              {t(`activities.${audience}Label` as DictionaryKey)}
            </option>
          ))}
        </select>
        {fieldError('audience')}
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-slate-800 px-5 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {event ? t('activities.saveChanges') : t('activities.add')}
      </button>
    </form>
  );
}
