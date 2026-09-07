'use client';

import { useActionState, useState } from 'react';
import {
  uploadProfilePhotoAction,
  deleteProfilePhotoAction,
  type ProfileFormState,
} from '@/lib/profile-actions';
import { useT } from '@/lib/i18n/client';

const INPUT = 'w-full rounded border border-slate-300 px-3 py-2';

// Uploads the signed-in member's own profile photo. Rendered only by
// app/(member)/profile/page.tsx, and only after it has already confirmed
// both photoUploadEnabled (the Blob credential exists) and
// user.photoUploadAllowed (the bishopric turned it on for this account) —
// this component itself checks neither.
//
// No personId field anywhere in this form: uploadProfilePhotoAction always
// resolves the target row from the session, never from anything submitted
// here. That is enforced server-side (see lib/profile-actions.ts), not by
// this component's honesty, but there is still no reason to give a form
// field that would only ever be ignored.
export function ProfilePhotoForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(
    uploadProfilePhotoAction,
    {}
  );

  // Same remount-by-key pattern as PhotoUploadForm.tsx: a successful
  // submission must clear the file input, which an uncontrolled form only
  // does by remounting.
  const [formInstance, setFormInstance] = useState(0);
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    setFormInstance((n) => n + 1);
  }

  return (
    <form
      key={formInstance}
      action={formAction}
      encType="multipart/form-data"
      className="max-w-sm space-y-3"
    >
      <label className="block space-y-1">
        <span className="font-semibold">{t('profile.upload')}</span>
        <input
          type="file"
          name="photo"
          accept="image/*"
          aria-describedby="profile-photo-error"
          className={INPUT}
        />
        <p
          id="profile-photo-error"
          role="alert"
          aria-live="polite"
          className="min-h-5 text-sm text-red-600"
        >
          {state.message}
        </p>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-slate-800 px-5 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {t('profile.upload')}
      </button>
    </form>
  );
}

// One-click delete, with the same confirm-before-destroy pattern as
// PhotoDeleteButton.tsx. No id, no personId: deleteProfilePhotoAction takes
// no arguments at all and only ever acts on the caller's own row.
export function ProfilePhotoDeleteButton() {
  const t = useT();

  return (
    <form
      action={deleteProfilePhotoAction}
      onSubmit={(event) => {
        if (!window.confirm(t('profile.confirmDelete'))) {
          event.preventDefault();
        }
      }}
    >
      <button type="submit" className="text-sm font-semibold text-red-700 underline">
        {t('profile.delete')}
      </button>
    </form>
  );
}
