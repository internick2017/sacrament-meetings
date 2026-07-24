'use client';

import RouteError from '@/components/RouteError';

// Catches unexpected errors raised by the create and edit Server Actions.
export default function AdminMeetingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError error={error} reset={reset} />;
}
