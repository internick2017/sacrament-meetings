'use client';

import Link from 'next/link';
import { useActionState, useId, useState } from 'react';
import { useT } from '@/lib/i18n/client';
import {
  cancelInterviewAction,
  markInterviewDoneAction,
  savePhoneAction,
  type InterviewActionState,
} from '@/lib/interviews-actions';
import WhatsappButton from './WhatsappButton';

const BUTTON = 'rounded border px-3 py-1 text-sm font-semibold disabled:opacity-50';

// Actions on one scheduled interview: show the WhatsApp message (and fix the
// member's phone there), mark it done, cancel it, or move it (the schedule
// form, prefilled).
export default function InterviewRowActions({
  interviewId,
  memberId,
  phone,
  message,
}: {
  interviewId: number;
  memberId: number;
  phone: string | null;
  message: string;
}) {
  const t = useT();
  const panelId = useId();
  const phoneInputId = useId();
  const [showMessage, setShowMessage] = useState(false);
  const [doneState, doneAction, donePending] = useActionState<InterviewActionState, FormData>(
    markInterviewDoneAction,
    {}
  );
  const [cancelState, cancelAction, cancelPending] = useActionState<InterviewActionState, FormData>(
    cancelInterviewAction,
    {}
  );
  const [phoneState, phoneAction, phonePending] = useActionState<InterviewActionState, FormData>(
    savePhoneAction,
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
      <div id={panelId} hidden={!showMessage} className="space-y-2">
        {showMessage && (
          <>
            {/* `phone` is the prop, re-sent by the server after savePhoneAction
                revalidates the board, so the button follows the saved number. */}
            <WhatsappButton phone={phone} message={message} />
            {/* Keyed by the stored phone: the uncontrolled input resets to the
                fresh value once the save comes back. */}
            <form key={phone ?? ''} action={phoneAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="memberId" value={memberId} />
              <div>
                <label htmlFor={phoneInputId} className="block text-sm font-semibold">
                  {t('interviews.form.phone')}
                </label>
                <input
                  id={phoneInputId}
                  type="tel"
                  name="phone"
                  defaultValue={phone ?? ''}
                  maxLength={40}
                  aria-describedby={`${phoneInputId}-hint`}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={phonePending}
                className={`${BUTTON} border-slate-300 text-slate-700 hover:bg-slate-50`}
              >
                {t('interviews.phone.save')}
              </button>
              <p id={`${phoneInputId}-hint`} className="w-full text-xs text-slate-500">
                {t('interviews.phone.hint')}
              </p>
              <p
                aria-live="polite"
                className={`w-full text-sm ${phoneState.saved ? 'text-green-700' : 'text-red-600'}`}
              >
                {phoneState.message}
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
