'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, NotAuthorizedError } from './authz';
import { getT } from './i18n/server';
import { parseRosterText } from './members-schema';
import { replaceMembers } from './members-db';

export interface RosterFormState {
  message?: string;
  saved?: boolean;
  errors?: { names?: string[] };
  // Echo of the textarea, so a rejected list is not thrown away.
  values?: { names: string };
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

  await replaceMembers(parsed.names);
  revalidatePath('/speakers');
  return { saved: true, message: t('speakers.roster.saved', { count: parsed.names.length }) };
}
