'use client';

import { useActionState, useState } from 'react';
import { uploadEventPhotoAction, type PhotoFormState } from '@/lib/event-photos-actions';
import type { Translator } from '@/lib/i18n';

const INPUT = 'w-full rounded border border-slate-300 px-3 py-2';

// Uploads one photo to an activity's gallery. Rendered only when the caller
// (EventGallery) has already confirmed both photoUploadEnabled (a server
// boolean read from the presence of BLOB_READ_WRITE_TOKEN) and that this
// viewer can edit the activity — this component itself does neither check.
//
// The two-argument uploadEventPhotoAction signature (prevState, formData)
// means this needs useActionState, same as EventForm.tsx, rather than a
// plain `action={...}` form like the void row actions elsewhere in this
// feature.
export default function PhotoUploadForm({
  eventId,
  // Whether the activity's own organization needs bishopric approval,
  // resolved on the server (photo-rules.needsApproval) and passed down so
  // the warning shows BEFORE the leader uploads, not after. Finding out
  // afterwards is the worst version.
  willNeedApproval,
  t,
}: {
  eventId: number;
  willNeedApproval: boolean;
  t: Translator;
}) {
  const [state, formAction, pending] = useActionState<PhotoFormState, FormData>(
    uploadEventPhotoAction,
    {}
  );

  // Same remount-by-key pattern as EventForm.tsx: a successful submission
  // must clear the file input and caption, which an uncontrolled form only
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
      <input type="hidden" name="eventId" value={eventId} />

      {willNeedApproval && (
        <p className="rounded bg-slate-100 px-3 py-2 text-sm text-slate-700">
          {t('photos.willNeedApproval')}
        </p>
      )}

      <label className="block space-y-1">
        <span className="font-semibold">{t('photos.add')}</span>
        <input
          type="file"
          name="photo"
          accept="image/*"
          aria-describedby="photo-error"
          className={INPUT}
        />
        {/* All validation branches in uploadEventPhotoAction (invalid id,
            invalid type, too large) are about the photo file, never the
            caption, so state.message is rendered here — matching the id
            aria-describedby actually points at. */}
        <p id="photo-error" role="alert" aria-live="polite" className="min-h-5 text-sm text-red-600">
          {state.message}
        </p>
      </label>

      <label className="block space-y-1">
        <span className="font-semibold">{t('photos.caption')}</span>
        <input type="text" name="caption" className={INPUT} />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-slate-800 px-5 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {t('photos.add')}
      </button>
    </form>
  );
}
