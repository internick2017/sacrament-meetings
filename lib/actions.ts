'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect, notFound } from 'next/navigation';
import {
  addMeeting as dbAddMeeting,
  updateMeeting as dbUpdateMeeting,
  deleteMeeting as dbDeleteMeeting,
  type MeetingInput,
} from './meetings-db';
import type { ProgramItem, WardBusinessItem } from './types';

const MEETING_TYPES = ['testimony', 'regular', 'stake', 'general', 'special'] as const;

// --- Validation -----------------------------------------------------------

const requiredText = (label: string) => z.string().trim().min(1, `${label} is required.`);

// Hymn numbers arrive from the form as strings, so coerce before validating.
const hymnNumber = z.coerce
  .number()
  .int('Hymn number must be a whole number.')
  .min(1, 'Enter a hymn number.')
  .max(1000, 'That hymn number looks too large.');

// Only the required, single-value fields are validated here. The optional list
// fields (announcements, ward business, speakers) are free-form textareas and
// are parsed separately below.
const MeetingFormSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date.'),
  meetingType: z.enum(MEETING_TYPES),
  presiding: requiredText('Presiding'),
  conducting: requiredText('Conducting'),
  openingHymnNumber: hymnNumber,
  openingHymnTitle: requiredText('Opening hymn title'),
  openingPrayer: requiredText('Opening prayer'),
  sacramentHymnNumber: hymnNumber,
  sacramentHymnTitle: requiredText('Sacrament hymn title'),
  closingHymnNumber: hymnNumber,
  closingHymnTitle: requiredText('Closing hymn title'),
  closingPrayer: requiredText('Closing prayer'),
});

// What each create/edit form action returns to useActionState: a general
// message and per-field error arrays keyed by the input's name.
export interface MeetingFormState {
  message?: string;
  errors?: Record<string, string[] | undefined>;
}

// The meetings table has a UNIQUE constraint on `date` (one meeting per day).
// A collision is Postgres error 23505 (unique_violation). We treat it as a
// correctable form error, not an unexpected server failure.
function isDuplicateDateError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}

const DUPLICATE_DATE_STATE: MeetingFormState = {
  message: 'Please fix the highlighted fields.',
  errors: { date: ['A meeting already exists on this date. Choose a different date.'] },
};

// --- Free-form list parsing ------------------------------------------------

function nonEmptyLines(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseWardBusiness(raw: FormDataEntryValue | null): WardBusinessItem[] {
  return nonEmptyLines(raw).map((description) => ({ description }));
}

// Each line is a speaker written "Name | Topic", unless it starts with "M:" (or
// "Music:"), which marks a musical number written "M: Performer | Title".
function parseProgram(raw: FormDataEntryValue | null): ProgramItem[] {
  return nonEmptyLines(raw).map((line) => {
    const musical = /^m(?:usic)?:\s*(.*)$/i.exec(line);
    if (musical) {
      const [performer = '', title = ''] = musical[1].split('|').map((s) => s.trim());
      return { type: 'musical-number', performer, title: title || undefined };
    }
    const [name = '', topic = ''] = line.split('|').map((s) => s.trim());
    return { type: 'speaker', name, topic };
  });
}

// Pull the raw string values the schema validates out of the submitted form.
function rawValues(formData: FormData) {
  return {
    date: formData.get('date'),
    meetingType: formData.get('meetingType'),
    presiding: formData.get('presiding'),
    conducting: formData.get('conducting'),
    openingHymnNumber: formData.get('openingHymnNumber'),
    openingHymnTitle: formData.get('openingHymnTitle'),
    openingPrayer: formData.get('openingPrayer'),
    sacramentHymnNumber: formData.get('sacramentHymnNumber'),
    sacramentHymnTitle: formData.get('sacramentHymnTitle'),
    closingHymnNumber: formData.get('closingHymnNumber'),
    closingHymnTitle: formData.get('closingHymnTitle'),
    closingPrayer: formData.get('closingPrayer'),
  };
}

// Combine the validated scalar fields with the parsed list fields into the
// full record the database layer expects.
function buildInput(
  data: z.infer<typeof MeetingFormSchema>,
  formData: FormData
): MeetingInput {
  return {
    date: data.date,
    meetingType: data.meetingType,
    presiding: data.presiding,
    conducting: data.conducting,
    announcements: nonEmptyLines(formData.get('announcements')),
    openingHymn: { number: data.openingHymnNumber, title: data.openingHymnTitle },
    openingPrayer: data.openingPrayer,
    wardBusiness: parseWardBusiness(formData.get('wardBusiness')),
    stakeBusiness: formData.get('stakeBusiness') === 'on',
    sacramentHymn: { number: data.sacramentHymnNumber, title: data.sacramentHymnTitle },
    program: parseProgram(formData.get('speakers')),
    closingHymn: { number: data.closingHymnNumber, title: data.closingHymnTitle },
    closingPrayer: data.closingPrayer,
  };
}

// --- Server Actions --------------------------------------------------------

export async function createMeeting(
  _prevState: MeetingFormState,
  formData: FormData
): Promise<MeetingFormState> {
  const parsed = MeetingFormSchema.safeParse(rawValues(formData));
  if (!parsed.success) {
    return {
      message: 'Please fix the highlighted fields.',
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  // Validation errors are returned above; only unexpected database failures are
  // caught here and re-thrown so the meetings error boundary can handle them.
  try {
    await dbAddMeeting(buildInput(parsed.data, formData));
  } catch (error) {
    if (isDuplicateDateError(error)) {
      return DUPLICATE_DATE_STATE;
    }
    console.error('createMeeting failed:', error);
    throw new Error('The meeting could not be saved. Please try again.');
  }

  revalidatePath('/meetings');
  redirect('/meetings');
}

export async function updateMeeting(
  id: number,
  _prevState: MeetingFormState,
  formData: FormData
): Promise<MeetingFormState> {
  const parsed = MeetingFormSchema.safeParse(rawValues(formData));
  if (!parsed.success) {
    return {
      message: 'Please fix the highlighted fields.',
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  let updated = false;
  try {
    updated = await dbUpdateMeeting(id, buildInput(parsed.data, formData));
  } catch (error) {
    if (isDuplicateDateError(error)) {
      return DUPLICATE_DATE_STATE;
    }
    console.error('updateMeeting failed:', error);
    throw new Error('The meeting could not be updated. Please try again.');
  }

  if (!updated) {
    notFound();
  }

  revalidatePath('/meetings');
  revalidatePath(`/meetings/${id}`);
  redirect(`/meetings/${id}`);
}

export async function deleteMeeting(formData: FormData): Promise<void> {
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) {
    throw new Error('Invalid meeting id.');
  }

  try {
    await dbDeleteMeeting(id);
  } catch (error) {
    console.error('deleteMeeting failed:', error);
    throw new Error('The meeting could not be deleted. Please try again.');
  }

  revalidatePath('/meetings');
  redirect('/meetings');
}
