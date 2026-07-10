'use client';

import { t } from '@/lib/i18n/en';

export default function PrintButton() {
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
