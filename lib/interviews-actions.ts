'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireInterviewAccess, NotAuthorizedError } from './authz';
import { userIdOf } from './authz-rules';
import { getT } from './i18n/server';
import type { Translator } from './i18n';
import { getUnit } from './unit-db';
import { zonedLocalToInstant } from './timezone';
import { normalizePhone } from './interview-message';
import { findConflicts, type Interview, type InterviewStatus } from './interviews-rules';
import { interviewFormSchema, type InterviewFormData } from './interviews-schema';
import {
  listInterviewBoard,
  insertInterview,
  setInterviewStatus,
  setMemberPhone,
  listScheduledFor,
  getInterview,
  rescheduleInterview,
  isActiveTithingConflict,
  type NewInterview,
} from './interviews-db';
import type { SessionUser } from './types';

const INTERVIEWS_PATH = '/interviews';

export interface InterviewFormValues {
  memberId: string;
  kind: string;
  interviewer: string;
  startsLocal: string;
  durationMinutes: string;
  mode: string;
  onlineLink: string;
  phone: string;
}

export interface InterviewFormState {
  message?: string;
  saved?: boolean;
  errors?: Record<string, string[] | undefined>;
  // Echo of what was typed, so a rejected form keeps its values.
  values?: InterviewFormValues;
  // Other scheduled interviews of the same interviewer that overlap the one
  // just saved. A warning, not a block: the interview IS saved.
  conflicts?: Interview[];
}

export interface InterviewActionState {
  message?: string;
  saved?: boolean;
  errors?: Record<string, string[] | undefined>;
}

// Every action starts here, before any database access. Returns the user, or
// null when the caller has no interview access.
async function guard(): Promise<SessionUser | null> {
  try {
    return await requireInterviewAccess();
  } catch (error) {
    if (error instanceof NotAuthorizedError) {
      return null;
    }
    throw error;
  }
}

function rawValuesFromForm(formData: FormData): InterviewFormValues {
  const field = (name: string) => String(formData.get(name) ?? '');
  return {
    memberId: field('memberId'),
    kind: field('kind'),
    interviewer: field('interviewer'),
    startsLocal: field('startsLocal'),
    durationMinutes: field('durationMinutes'),
    mode: field('mode'),
    onlineLink: field('onlineLink'),
    phone: field('phone'),
  };
}

// A missing field must not pass: Number(null) is 0 and Number('') is 0.
function positiveId(value: FormDataEntryValue | null): number | null {
  const id = value === null || value === '' ? NaN : Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function toNewInterview(data: InterviewFormData): Promise<NewInterview> {
  const unit = await getUnit();
  return {
    memberId: data.memberId,
    kind: data.kind,
    interviewer: data.interviewer,
    // The schema has already rejected anything that is not a real local date
    // and time, so this conversion (and findConflicts after it) never sees
    // garbage.
    startsAt: zonedLocalToInstant(data.startsLocal, unit.timezone),
    durationMinutes: data.durationMinutes,
    mode: data.mode,
    onlineLink: data.onlineLink,
  };
}

// The phone on the form is optional: only a number that can become a
// WhatsApp link replaces the stored one; anything else leaves it untouched.
async function maybeSavePhone(memberId: number, phone: string): Promise<void> {
  if (phone !== '' && normalizePhone(phone) !== null) {
    await setMemberPhone(memberId, phone);
  }
}

function savedState(
  t: Translator,
  conflicts: Interview[],
  savedKey: 'interviews.saved' | 'interviews.rescheduled'
): InterviewFormState {
  return {
    saved: true,
    message: conflicts.length > 0 ? t('interviews.savedWithConflicts') : t(savedKey),
    conflicts,
  };
}

export async function scheduleInterviewAction(
  _prevState: InterviewFormState,
  formData: FormData
): Promise<InterviewFormState> {
  const t = await getT();
  const user = await guard();
  if (!user) {
    return { message: t('admin.notAllowed') };
  }

  const values = rawValuesFromForm(formData);
  const parsed = interviewFormSchema(t).safeParse(values);
  if (!parsed.success) {
    return {
      message: t('validation.fixFields'),
      errors: z.flattenError(parsed.error).fieldErrors,
      values,
    };
  }
  const data = parsed.data;

  const board = await listInterviewBoard();
  const row = board.find((entry) => entry.member.id === data.memberId);
  if (!row) {
    const message = t('validation.interview.memberNotFound');
    return { message, errors: { memberId: [message] }, values };
  }
  if (
    data.kind === 'tithing' &&
    row.interviews.some((other) => other.kind === 'tithing' && other.status === 'scheduled')
  ) {
    const message = t('validation.interview.tithingAlreadyScheduled');
    return { message, errors: { memberId: [message] }, values };
  }

  const interview = await toNewInterview(data);
  const conflicts = findConflicts(interview, await listScheduledFor(interview.interviewer));

  try {
    await insertInterview(interview, userIdOf(user));
  } catch (error) {
    // The check above is the friendly path; the unique index (migration 015)
    // is what stops two saves that raced past it.
    if (isActiveTithingConflict(error)) {
      const message = t('validation.interview.tithingAlreadyScheduled');
      return { message, errors: { memberId: [message] }, values };
    }
    throw error;
  }
  await maybeSavePhone(data.memberId, data.phone);

  revalidatePath(INTERVIEWS_PATH);
  return savedState(t, conflicts, 'interviews.saved');
}

// Moves a scheduled interview: same member and kind, new time, mode, link
// and interviewer, all under the same rules as scheduling. The old row is
// kept as `rescheduled` (see rescheduleInterview).
export async function rescheduleInterviewAction(
  _prevState: InterviewFormState,
  formData: FormData
): Promise<InterviewFormState> {
  const t = await getT();
  const user = await guard();
  if (!user) {
    return { message: t('admin.notAllowed') };
  }

  const id = positiveId(formData.get('id'));
  if (id === null) {
    return { message: t('validation.interview.invalidId') };
  }

  const old = await getInterview(id);
  if (!old || old.status !== 'scheduled') {
    return { message: t('interviews.notScheduled') };
  }

  // Member and kind come from the interview being moved, never from the form.
  const values = {
    ...rawValuesFromForm(formData),
    memberId: String(old.memberId),
    kind: old.kind,
  };
  const parsed = interviewFormSchema(t).safeParse(values);
  if (!parsed.success) {
    return {
      message: t('validation.fixFields'),
      errors: z.flattenError(parsed.error).fieldErrors,
      values,
    };
  }

  const interview = await toNewInterview(parsed.data);
  const conflicts = findConflicts(interview, await listScheduledFor(interview.interviewer), old.id);

  let newId: number | null;
  try {
    newId = await rescheduleInterview(old.id, interview, userIdOf(user));
  } catch (error) {
    if (isActiveTithingConflict(error)) {
      const message = t('validation.interview.tithingAlreadyScheduled');
      return { message, errors: { memberId: [message] }, values };
    }
    throw error;
  }
  // Null: someone closed or moved the interview after it was read above.
  if (newId === null) {
    return { message: t('interviews.notScheduled'), values };
  }
  await maybeSavePhone(parsed.data.memberId, parsed.data.phone);

  revalidatePath(INTERVIEWS_PATH);
  return savedState(t, conflicts, 'interviews.rescheduled');
}

// Done and cancelled are both reached only from `scheduled`; the guarded
// UPDATE in setInterviewStatus is what enforces it.
async function closeScheduled(
  formData: FormData,
  status: Extract<InterviewStatus, 'done' | 'cancelled'>
): Promise<InterviewActionState> {
  const t = await getT();
  const user = await guard();
  if (!user) {
    return { message: t('admin.notAllowed') };
  }

  const id = positiveId(formData.get('id'));
  if (id === null) {
    return { message: t('validation.interview.invalidId') };
  }

  if (!(await setInterviewStatus(id, status))) {
    return { message: t('interviews.notScheduled') };
  }
  revalidatePath(INTERVIEWS_PATH);
  return {
    saved: true,
    message: status === 'done' ? t('interviews.markedDone') : t('interviews.cancelled'),
  };
}

export async function markInterviewDoneAction(
  _prevState: InterviewActionState,
  formData: FormData
): Promise<InterviewActionState> {
  return closeScheduled(formData, 'done');
}

export async function cancelInterviewAction(
  _prevState: InterviewActionState,
  formData: FormData
): Promise<InterviewActionState> {
  return closeScheduled(formData, 'cancelled');
}

// Corrects a member's phone. An empty value clears it; anything else must be
// usable for WhatsApp and is stored exactly as typed (trimmed).
export async function savePhoneAction(
  _prevState: InterviewActionState,
  formData: FormData
): Promise<InterviewActionState> {
  const t = await getT();
  const user = await guard();
  if (!user) {
    return { message: t('admin.notAllowed') };
  }

  const memberId = positiveId(formData.get('memberId'));
  if (memberId === null) {
    const message = t('validation.interview.member');
    return { message, errors: { memberId: [message] } };
  }

  const phone = String(formData.get('phone') ?? '').trim();
  if (phone !== '' && (phone.length > 40 || normalizePhone(phone) === null)) {
    const message = t('validation.interview.phone');
    return { message, errors: { phone: [message] } };
  }

  await setMemberPhone(memberId, phone === '' ? null : phone);
  revalidatePath(INTERVIEWS_PATH);
  return {
    saved: true,
    message: phone === '' ? t('interviews.phoneCleared') : t('interviews.phoneSaved'),
  };
}
