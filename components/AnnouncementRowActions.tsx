'use client';

import Link from 'next/link';
import { deleteAnnouncementAction } from '@/lib/announcements-actions';
import { useT } from '@/lib/i18n/client';

// Edit link plus a delete form that confirms, following the same
// window.confirm() pattern as CallingRowActions.tsx.
export default function AnnouncementRowActions({ id }: { id: number }) {
  const t = useT();

  return (
    <div className="flex gap-2">
      <Link
        href={`/announcements/${id}/edit`}
        className="rounded border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        {t('announcements.edit')}
      </Link>

      <form
        action={deleteAnnouncementAction}
        onSubmit={(event) => {
          if (!window.confirm(t('announcements.confirmDelete'))) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          className="rounded border border-red-300 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50"
        >
          {t('announcements.delete')}
        </button>
      </form>
    </div>
  );
}
