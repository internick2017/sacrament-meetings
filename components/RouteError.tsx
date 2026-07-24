'use client';

import Link from 'next/link';
import { useEffect } from 'react';

// Shared UI for the meetings error boundaries. Error boundaries must be Client
// Components; the `reset` prop re-renders the segment to retry.
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the real error in the console for debugging; the user only sees
    // the friendly message below.
    console.error(error);
  }, [error]);

  return (
    <div className="rounded border border-red-200 bg-red-50 p-6">
      <h1 className="text-xl font-bold text-red-800">Something went wrong</h1>
      <p className="mt-2 text-sm text-red-700">
        {error.message || 'An unexpected error occurred while loading meetings.'}
      </p>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
        >
          Try Again
        </button>
        <Link href="/meetings" className="text-sm text-red-800 underline">
          Back to meetings
        </Link>
      </div>
    </div>
  );
}
