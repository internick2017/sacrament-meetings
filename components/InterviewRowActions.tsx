'use client';

import Link from 'next/link';
import { useActionState, useId, useState } from 'react';
import { useT } from '@/lib/i18n/client';
import {
  cancelInterviewAction,
  markInterviewDoneAction,
  type InterviewActionState,
} from '@/lib/interviews-actions';
import WhatsappButton from './WhatsappButton';

const BUTTON = 'rounded border px-3 py-1 text-sm font-semibold disabled:opacity-50';

// Actions on one scheduled interview: show the WhatsApp message, mark it
// done, cancel it, or move it (the schedule form, prefilled).
export default function InterviewRowActions({
  interviewId,
  phone,
  message,
}: {
  interviewId: number;
  phone: string | null;
  message: string;
}) {
  const t = useT();
  const panelId = useId();
  const [showMessage, setShowMessage] = useState(false);
  const [doneState, doneAction, donePending] = useActionState<InterviewActionState, FormData>(
    markInterviewDoneAction,
    {}
  );
  const [cancelState, cancelAction, cancelPending] = useActionState<InterviewActionState, FormData>(
    cancelInterviewAction,
    {}
  );
  const notice = doneState.message ?? cancelState.message;

  function confirmFirst(text: string) {
    return (event: React.FormEvent<HTMLFormElement>) => {
      if (!window.confirm(text)) event.preventDefault();
    };
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-expanded={showMessage}
          aria-controls={panelId}
          onClick={() => setShowMessage((open) => !open)}
          className={`${BUTTON} border-green-600 text-green-800 hover:bg-green-50`}
        >
          {t('interviews.message')}
        </button>
        <form action={doneAction} onSubmit={confirmFirst(t('interviews.confirmDone'))}>
          <input type="hidden" name="id" value={interviewId} />
          <button
            type="submit"
            disabled={donePending}
            className={`${BUTTON} border-slate-300 text-slate-700 hover:bg-slate-50`}
          >
            {t('interviews.markDone')}
          </button>
        </form>
        <Link
          href={`/interviews/schedule?reschedule=${interviewId}`}
          className={`${BUTTON} border-slate-300 text-slate-700 hover:bg-slate-50`}
        >
          {t('interviews.reschedule')}
        </Link>
        <form action={cancelAction} onSubmit={confirmFirst(t('interviews.confirmCancel'))}>
          <input type="hidden" name="id" value={interviewId} />
          <button
            type="submit"
            disabled={cancelPending}
            className={`${BUTTON} border-red-300 text-red-700 hover:bg-red-50`}
          >
            {t('interviews.cancel')}
          </button>
        </form>
      </div>
      <p aria-live="polite" className="text-sm text-slate-600">
        {notice}
      </p>
      <div id={panelId} hidden={!showMessage}>
        {showMessage && <WhatsappButton phone={phone} message={message} />}
      </div>
    </div>
  );
}
