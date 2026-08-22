'use client';

import { useActionState } from 'react';
import { updateMeeting, type MeetingFormState } from '@/lib/actions';
import MeetingForm from '@/components/MeetingForm';
import type { SacramentMeeting } from '@/lib/types';

const initialState: MeetingFormState = {};

export default function EditMeetingForm({ meeting }: { meeting: SacramentMeeting }) {
  // Bind the meeting id as the first argument so the action signature matches
  // useActionState's (prevState, formData).
  const updateWithId = updateMeeting.bind(null, meeting.id);
  const [state, formAction, isPending] = useActionState(updateWithId, initialState);

  return (
    <MeetingForm
      action={formAction}
      state={state}
      isPending={isPending}
      submitLabel="form.editSubmit"
      defaultMeeting={meeting}
    />
  );
}
