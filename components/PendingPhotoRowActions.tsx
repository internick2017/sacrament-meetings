'use client';

import { approveEventPhotoAction, deleteEventPhotoAction } from '@/lib/event-photos-actions';
import { useT } from '@/lib/i18n/client';

// Two one-line forms per pending photo: approve (publishes it) and delete
// (removes it, with the same confirm-before-destroy pattern as
// CallingRowActions.tsx). Approve is not destructive so it needs no
// confirmation.
export default function PendingPhotoRowActions({ id }: { id: number }) {
  const t = useT();

  return (
    <div className="flex gap-2">
      <form action={approveEventPhotoAction}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          className="rounded border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {t('photos.approve')}
        </button>
      </form>

      <form
        action={deleteEventPhotoAction}
        onSubmit={(event) => {
          if (!window.confirm(t('photos.confirmDelete'))) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          className="rounded border border-red-300 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50"
        >
          {t('photos.delete')}
        </button>
      </form>
    </div>
  );
}
