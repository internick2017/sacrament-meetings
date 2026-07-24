'use client';

import { useActionState } from 'react';
import { createMeeting, type MeetingFormState } from '@/lib/actions';
import MeetingForm from '@/components/MeetingForm';

const initialState: MeetingFormState = {};

export default function NewMeetingPage() {
  const [state, formAction, isPending] = useActionState(createMeeting, initialState);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Create a Meeting</h1>
      <MeetingForm
        action={formAction}
        state={state}
        isPending={isPending}
        submitLabel="Create meeting"
      />
    </div>
  );
}
