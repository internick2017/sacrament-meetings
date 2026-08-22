'use client';

import { useActionState } from 'react';
import { createMeeting, type MeetingFormState } from '@/lib/actions';
import MeetingForm from '@/components/MeetingForm';
import { useT } from '@/lib/i18n/client';

const initialState: MeetingFormState = {};

export default function NewMeetingPage() {
  const t = useT();
  const [state, formAction, isPending] = useActionState(createMeeting, initialState);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t('form.createTitle')}</h1>
      <MeetingForm
        action={formAction}
        state={state}
        isPending={isPending}
        submitLabel="form.createSubmit"
      />
    </div>
  );
}
