'use client';

import { deleteEventPhotoAction } from '@/lib/event-photos-actions';
import { useT } from '@/lib/i18n/client';

// One-photo delete form, with the same confirm-before-destroy pattern as
// CallingRowActions.tsx and EventRowActions.tsx. Split out from
// EventGallery.tsx (a Server Component) because window.confirm needs a
// Client Component.
export default function PhotoDeleteButton({ id }: { id: number }) {
  const t = useT();

  return (
    <form
      action={deleteEventPhotoAction}
      onSubmit={(event) => {
        if (!window.confirm(t('photos.confirmDelete'))) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-xs font-semibold text-red-700 underline">
        {t('photos.delete')}
      </button>
    </form>
  );
}
