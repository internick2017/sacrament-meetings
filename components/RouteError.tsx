'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useT } from '@/lib/i18n/client';

// Shared UI for the meetings error boundaries. Error boundaries must be Client
// Components; the `reset` prop re-renders the segment to retry.
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    // Surface the real error in the console for debugging; the user only sees
    // the friendly message below.
    console.error(error);
  }, [error]);

  return (
    <div className="rounded border border-red-200 bg-red-50 p-6">
      <h1 className="text-xl font-bold text-red-800">{t('error.title')}</h1>
      <p className="mt-2 text-sm text-red-700">
        {error.message || t('error.generic')}
      </p>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
        >
          {t('error.tryAgain')}
        </button>
        <Link href="/meetings" className="text-sm text-red-800 underline">
          {t('error.back')}
        </Link>
      </div>
    </div>
  );
}
