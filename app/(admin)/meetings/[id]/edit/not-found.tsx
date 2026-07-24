import Link from 'next/link';

// Rendered when the edit page calls notFound() for a missing or invalid id.
export default function EditMeetingNotFound() {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-6">
      <h1 className="text-xl font-bold">Meeting not found</h1>
      <p className="mt-2 text-sm text-slate-600">
        We could not find a meeting with that id. It may have been deleted.
      </p>
      <Link href="/meetings" className="mt-4 inline-block text-sm text-slate-800 underline">
        Back to meetings
      </Link>
    </div>
  );
}
