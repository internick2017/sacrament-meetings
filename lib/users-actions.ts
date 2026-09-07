'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAdmin, NotAuthorizedError } from './authz';
import { getT } from './i18n/server';
import { userFormSchema } from './users-schema';
import {
  addUser,
  updateUserRole,
  updateUserPhotoUploadAllowed,
  deleteUser,
  getAppUserById,
} from './users-db';
import { getOrganizationIdByKey } from './organizations-db';
import { getPersonById, clearPersonPhoto } from './people-db';
import { deleteImage } from './blob';
import { ROLES, ORGANIZATION_KEYS } from './types';

export interface UserFormState {
  message?: string;
  errors?: Record<string, string[] | undefined>;
  // Echo of the raw submitted values, so a failed validation does not throw
  // away what the admin typed.
  values?: {
    email: string;
    role: string;
    organizationKey: string;
  };
}

function isDuplicateEmailError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}

export async function addUserAction(
  _prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  const t = await getT();

  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof NotAuthorizedError) {
      return { message: t('admin.notAllowed') };
    }
    throw error;
  }

  const rawValues = {
    email: String(formData.get('email') ?? ''),
    role: String(formData.get('role') ?? ''),
    organizationKey: String(formData.get('organizationKey') ?? ''),
  };

  const parsed = userFormSchema(t).safeParse(rawValues);

  if (!parsed.success) {
    return {
      message: t('validation.fixFields'),
      errors: z.flattenError(parsed.error).fieldErrors,
      values: rawValues,
    };
  }

  let organizationId: number | null = null;
  if (parsed.data.organizationKey !== '') {
    const id = await getOrganizationIdByKey(parsed.data.organizationKey);
    if (id === undefined) {
      // The enum already restricts the key to the seven seeded organizations,
      // so this only fires if the database and the code have drifted apart.
      return { message: t('validation.fixFields'), values: rawValues };
    }
    organizationId = id;
  }

  try {
    // The parsed (lowercased, trimmed) email is what reaches the INSERT, not
    // the raw form value: the unique index is on lower(email).
    await addUser({ email: parsed.data.email, role: parsed.data.role, organizationId });
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      return {
        message: t('validation.fixFields'),
        errors: { email: [t('validation.user.duplicateEmail')] },
        values: rawValues,
      };
    }
    throw error;
  }

  revalidatePath('/users');
  return { message: t('users.added') };
}

// Only role and organization change here, never the e-mail, so this validates
// those two fields directly instead of routing through userFormSchema (which
// requires an e-mail and would need a placeholder value to satisfy it).
const roleUpdateSchema = z
  .object({
    role: z.enum(ROLES),
    organizationKey: z.union([z.enum(ORGANIZATION_KEYS), z.literal('')]),
  })
  .refine((data) => data.role !== 'leader' || data.organizationKey !== '', {
    path: ['organizationKey'],
  });

// A well-formed id is a positive integer: `Number(missingField)` is 0, which
// passes `Number.isInteger` but never names a real row.
function isValidId(id: number): boolean {
  return Number.isInteger(id) && id > 0;
}

export interface UserRowState {
  message?: string;
}

export async function updateUserRoleAction(
  _prevState: UserRowState,
  formData: FormData
): Promise<UserRowState> {
  const t = await getT();

  const id = Number(formData.get('id'));
  const role = String(formData.get('role') ?? '');
  const organizationKey = String(formData.get('organizationKey') ?? '');

  if (!isValidId(id)) {
    return { message: t('validation.user.invalidId') };
  }

  let sessionUser;
  try {
    sessionUser = await requireAdmin();
  } catch (error) {
    if (error instanceof NotAuthorizedError) {
      return { message: t('admin.notAllowed') };
    }
    throw error;
  }

  // An admin cannot change their own role: doing so could leave the
  // congregation with nobody able to administer the site. This is
  // unreachable through the UI (the row renders no form for the caller's own
  // account), kept here only as defense in depth.
  if (String(sessionUser.id) === String(id)) {
    return {};
  }

  const parsed = roleUpdateSchema.safeParse({ role, organizationKey });
  if (!parsed.success) {
    return { message: t('validation.user.leaderNeedsOrganization') };
  }

  let organizationId: number | null = null;
  if (parsed.data.organizationKey !== '') {
    const orgId = await getOrganizationIdByKey(parsed.data.organizationKey);
    if (orgId === undefined) {
      // The enum already restricts the key to the seven seeded organizations,
      // so this only fires if the database and the code have drifted apart.
      return { message: t('validation.fixFields') };
    }
    organizationId = orgId;
  }

  await updateUserRole(id, parsed.data.role, organizationId);
  revalidatePath('/users');
  return { message: t('users.updated') };
}

// Toggles whether one account may upload its own profile photo. Admin only,
// following updateUserRoleAction's shape: id and the new value both come
// from the form, requireAdmin() gates the whole thing, and the panel that
// renders this control carries the users.photoWarning text — never enable
// this for a minor's account.
export async function updatePhotoUploadAllowedAction(formData: FormData): Promise<void> {
  const id = Number(formData.get('id'));
  const allowed = formData.get('allowed') === 'true';

  if (!isValidId(id)) {
    return;
  }

  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof NotAuthorizedError) {
      return;
    }
    throw error;
  }

  await updateUserPhotoUploadAllowed(id, allowed);
  revalidatePath('/users');
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  const id = Number(formData.get('id'));
  if (!isValidId(id)) {
    return;
  }

  let sessionUser;
  try {
    sessionUser = await requireAdmin();
  } catch (error) {
    if (error instanceof NotAuthorizedError) {
      return;
    }
    throw error;
  }

  // Same rule as above: an admin cannot delete their own account.
  if (String(sessionUser.id) === String(id)) {
    return;
  }

  // Deleting an account must not leave its linked person's profile photo
  // behind, published with nobody now able to remove it: the account is
  // gone, so the one person who could remove it themselves
  // (deleteProfilePhotoAction, gated to the session's own person_id) no
  // longer exists. Looked up and cleared BEFORE the account row is gone,
  // same reasoning as every other delete-then-cleanup pair in this project;
  // clearing the photo never blocks the account deletion below, even if the
  // account has no linked person (deletedUser?.personId is then null and
  // the whole block is skipped).
  const deletedUser = await getAppUserById(id);
  if (deletedUser?.personId !== null && deletedUser?.personId !== undefined) {
    const person = await getPersonById(deletedUser.personId);
    await clearPersonPhoto(deletedUser.personId);
    try {
      await deleteImage(person?.photoUrl);
    } catch (error) {
      console.error('Image delete failed, leaving the old file in place', error);
    }
  }

  await deleteUser(id);
  revalidatePath('/users');
}
