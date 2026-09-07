'use client';

import { useActionState, useState } from 'react';
import {
  addAnnouncementAction,
  updateAnnouncementAction,
  type AnnouncementFormState,
} from '@/lib/announcements-actions';
import { useT } from '@/lib/i18n/client';
import { AUDIENCES, type OrganizationKey } from '@/lib/types';
import type { DictionaryKey } from '@/lib/i18n';

const INPUT = 'w-full rounded border border-slate-300 px-3 py-2';

interface AnnouncementFormProps {
  // Which organizations show in the picker, and whether the "whole unit"
  // option is offered. Same UI-only scoping as EventForm.tsx and
  // CallingForm.tsx: an admin sees all seven organizations plus the
  // whole-unit option, a leader sees only their own with no whole-unit
  // option. The server-side guard in announcements-actions.ts
  // (requireLeaderOf) still enforces this regardless of what the picker
  // offers.
  organizationKeys: readonly OrganizationKey[];
  allowBranchWide: boolean;
  // Present only when editing an existing announcement.
  announcement?: {
    id: number;
    organizationKey: OrganizationKey | null;
    title: string;
    body: string;
    startsOn: string;
    endsOn: string;
    audience: string;
  };
}

export default function AnnouncementForm({
  organizationKeys,
  allowBranchWide,
  announcement,
}: AnnouncementFormProps) {
  const t = useT();
  const action = announcement ? updateAnnouncementAction : addAnnouncementAction;
  const [state, formAction, pending] = useActionState<AnnouncementFormState, FormData>(action, {});

  // Same remount-by-key pattern as EventForm.tsx: useActionState returns a
  // new state object per submission, but React reuses the existing
  // uncontrolled input DOM nodes, so a new defaultValue alone would be
  // silently ignored without forcing a remount.
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
  // submission, it falls back to the announcement being edited, or blank
  // defaults for a brand-new one. This must read state.values FIRST: when
  // updateAnnouncementAction rejects because the announcement moved out of
  // reach (or was deleted from under the editor), it echoes the raw
  // submitted organizationKey in state.values, and reading the stored row
  // instead here would silently reset the organization picker on every
  // failed submit.
  const values = state.values ?? {
    organizationKey: announcement?.organizationKey ?? '',
    title: announcement?.title ?? '',
    body: announcement?.body ?? '',
    startsOn: announcement?.startsOn ?? '',
    endsOn: announcement?.endsOn ?? '',
    audience: announcement?.audience ?? 'private',
  };

  return (
    <form key={formInstance} action={formAction} className="max-w-xl space-y-4">
      {announcement && <input type="hidden" name="id" value={announcement.id} />}

      {/* updateAnnouncementAction returns admin.notAllowed as a bare message
          with no errors object when the announcement is missing or
          forbidden (e.g. it was moved to another organization by someone
          else while this form was open). Rendering state.message here is
          what keeps that case from looking like the form silently refused
          to save. */}
      {state.message && (
        <p role="alert" aria-live="polite" className="rounded bg-slate-100 px-3 py-2 text-sm">
          {state.message}
        </p>
      )}

      <label className="block space-y-1">
        <span className="font-semibold">{t('announcements.organization')}</span>
        <select
          name="organizationKey"
          defaultValue={values.organizationKey}
          aria-describedby="organizationKey-error"
          className={INPUT}
        >
          {allowBranchWide && <option value="">{t('announcements.unitWide')}</option>}
          {organizationKeys.map((key) => (
            <option key={key} value={key}>
              {t(`organization.${key}` as DictionaryKey)}
            </option>
          ))}
        </select>
        {fieldError('organizationKey')}
      </label>

      <label className="block space-y-1">
        <span className="font-semibold">{t('announcements.titleLabel')}</span>
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
        <span className="font-semibold">{t('announcements.body')}</span>
        <textarea
          name="body"
          defaultValue={values.body}
          aria-describedby="body-error"
          rows={4}
          className={INPUT}
        />
        {fieldError('body')}
      </label>

      <label className="block space-y-1">
        <span className="font-semibold">{t('announcements.from')}</span>
        <input
          type="date"
          name="startsOn"
          defaultValue={values.startsOn}
          aria-describedby="startsOn-error"
          className={INPUT}
        />
        {fieldError('startsOn')}
      </label>

      <label className="block space-y-1">
        <span className="font-semibold">{t('announcements.until')}</span>
        <input
          type="date"
          name="endsOn"
          defaultValue={values.endsOn}
          aria-describedby="endsOn-error"
          required
          className={INPUT}
        />
        {fieldError('endsOn')}
      </label>

      <label className="block space-y-1">
        <span className="font-semibold">{t('announcements.audience')}</span>
        <select
          name="audience"
          defaultValue={values.audience}
          aria-describedby="audience-error"
          className={INPUT}
        >
          {AUDIENCES.map((audience) => (
            <option key={audience} value={audience}>
              {t(`announcements.${audience}Label` as DictionaryKey)}
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
        {announcement ? t('announcements.saveChanges') : t('announcements.new')}
      </button>
    </form>
  );
}
