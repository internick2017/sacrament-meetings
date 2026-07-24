'use client';

import RouteError from '@/components/RouteError';

// Catches unexpected errors while reading the meetings list/detail or running
// the delete action from a card.
export default function MeetingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError error={error} reset={reset} />;
}
