'use client';

import { deleteEventAction } from '@/lib/events-actions';
import { useT } from '@/lib/i18n/client';

// One form per activity row: delete, with the same confirm-before-destroy
// pattern as CallingRowActions.tsx. Editing is a plain link on the row
// itself (see app/(admin)/activities/page.tsx), not a form, since it only
// navigates.
export default function EventRowActions({ id }: { id: number }) {
  const t = useT();

  return (
    <form
      action={deleteEventAction}
      onSubmit={(event) => {
        if (!window.confirm(t('activities.confirmDelete'))) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded border border-red-300 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50"
      >
        {t('activities.delete')}
      </button>
    </form>
  );
}
