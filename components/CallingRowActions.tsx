'use client';

import { endCallingAction, deleteCallingAction } from '@/lib/callings-actions';
import { useT } from '@/lib/i18n/client';

// Two one-line forms per calling: release (sets ended_on, keeps history) and
// delete (removes the row, for correcting a mistyped entry). Only delete asks
// for confirmation, following the same window.confirm() pattern as
// DeleteMeetingButton.tsx; release is not destructive so it needs none.
export default function CallingRowActions({ id }: { id: number }) {
  const t = useT();

  return (
    <div className="flex gap-2">
      <form action={endCallingAction}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          className="rounded border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {t('callings.release')}
        </button>
      </form>

      <form
        action={deleteCallingAction}
        onSubmit={(event) => {
          if (!window.confirm(t('callings.confirmDelete'))) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          className="rounded border border-red-300 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50"
        >
          {t('callings.delete')}
        </button>
      </form>
    </div>
  );
}
