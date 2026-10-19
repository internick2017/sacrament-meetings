'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, NotAuthorizedError } from './authz';
import { getT } from './i18n/server';
import { parseRosterText } from './members-schema';
import { planRoster, removedMembersWithData, replaceMembers } from './members-db';

// How many of the affected names the warning lists; the count covers the rest.
const MAX_LISTED_REMOVALS = 10;

export interface RosterFormState {
  message?: string;
  saved?: boolean;
  errors?: { names?: string[] };
  // Echo of the textarea, so a rejected list is not thrown away.
  values?: { names: string };
  // Set when the save would delete members that carry data (interviews, a
  // phone, head of household). Nothing was written; the form asks to confirm.
  removal?: { names: string[]; count: number };
}

export async function saveRosterAction(
  _prevState: RosterFormState,
  formData: FormData
): Promise<RosterFormState> {
  const t = await getT();

  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof NotAuthorizedError) {
      return { message: t('admin.notAllowed') };
    }
    throw error;
  }

  const text = String(formData.get('names') ?? '');
  const parsed = parseRosterText(text);
  if (!parsed.ok) {
    return {
      message: t('validation.fixFields'),
      errors: {
        names: [parsed.error === 'tooMany' ? t('validation.roster.tooMany') : t('validation.roster.tooLong')],
      },
      values: { names: text },
    };
  }

  if (parsed.names.length === 0) {
    return {
      message: t('validation.fixFields'),
      errors: { names: [t('validation.roster.empty')] },
      values: { names: text },
    };
  }

  const change = await planRoster(parsed.names);
  if (formData.get('confirmRemoval') !== 'on') {
    const withData = await removedMembersWithData(change.toRemoveIds);
    if (withData.length > 0) {
      return {
        message: t('speakers.roster.removalWarning', { count: withData.length }),
        removal: { names: withData.slice(0, MAX_LISTED_REMOVALS), count: withData.length },
        values: { names: text },
      };
    }
  }

  await replaceMembers(change);
  revalidatePath('/speakers');
  return { saved: true, message: t('speakers.roster.saved', { count: parsed.names.length }) };
}
