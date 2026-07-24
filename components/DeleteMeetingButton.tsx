'use client';

import { deleteMeeting } from '@/lib/actions';

// A small form that posts the meeting id to the deleteMeeting Server Action.
// The confirm() guards against accidental deletion; if the user cancels we stop
// the submit so the action never runs.
export default function DeleteMeetingButton({ id }: { id: number }) {
  return (
    <form
      action={deleteMeeting}
      onSubmit={(event) => {
        if (!window.confirm('Delete this meeting? This cannot be undone.')) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded border border-red-300 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50"
      >
        Delete
      </button>
    </form>
  );
}
