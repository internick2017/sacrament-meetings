'use client';

import { useT } from '@/lib/i18n/client';

export default function PrintButton() {
  const t = useT();

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded border border-slate-400 px-4 py-2 text-sm font-semibold hover:bg-slate-100"
    >
      {t('meeting.print')}
    </button>
  );
}
