import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/authz';
import { getT } from '@/lib/i18n/server';
import { listInterviewBoard } from '@/lib/interviews-db';
import { getUnit } from '@/lib/unit-db';
import { toDatetimeLocalValue } from '@/lib/timezone';
import NotAllowed from '@/components/NotAllowed';
import InterviewForm, { type InterviewFormInitial } from '@/components/InterviewForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('interviews.form.title') };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInt(value: string | undefined): number | null {
  const id = value ? Number(value) : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
}

// ?member=<id>&kind=tithing|individual starts a new interview;
// ?reschedule=<interview id> moves a scheduled one.
export default async function ScheduleInterviewPage({ searchParams }: { searchParams: SearchParams }) {
  const [sessionUser, t, params] = await Promise.all([getSessionUser(), getT(), searchParams]);

  // Same gate as the board, before any member or phone is read.
  if (!sessionUser) {
    redirect('/login');
  }
  if (sessionUser.role !== 'admin' && sessionUser.role !== 'secretary') {
    return <NotAllowed />;
  }

  const [rows, unit] = await Promise.all([listInterviewBoard(), getUnit()]);
  const members = rows.map(({ member }) => member);

  const rescheduleId = positiveInt(first(params.reschedule));
  let initial: InterviewFormInitial;
  let title = t('interviews.form.title');

  if (rescheduleId !== null) {
    const interview = rows
      .flatMap((row) => row.interviews)
      .find((candidate) => candidate.id === rescheduleId && candidate.status === 'scheduled');
    if (!interview) {
      return (
        <section className="space-y-4">
          <h1 className="text-2xl font-bold">{t('interviews.form.rescheduleTitle')}</h1>
          <p className="text-slate-600">{t('interviews.form.notFound')}</p>
          <Link href="/interviews" className="text-blue-700 underline">
            {t('interviews.form.back')}
          </Link>
        </section>
      );
    }
    title = t('interviews.form.rescheduleTitle');
    initial = {
      memberId: interview.memberId,
      kind: interview.kind,
      interviewer: interview.interviewer,
      startsLocal: toDatetimeLocalValue(interview.startsAt, unit.timezone),
      durationMinutes: interview.durationMinutes,
      mode: interview.mode,
      onlineLink: interview.onlineLink ?? '',
    };
  } else {
    const memberId = positiveInt(first(params.member));
    const member = members.find((candidate) => candidate.id === memberId) ?? null;
    const kindParam = first(params.kind);
    // Tithing is only for a head of family, so ?kind=tithing is ignored for
    // anyone else; a head defaults to tithing unless asked otherwise.
    const kind =
      member && !member.isHead
        ? 'individual'
        : kindParam === 'tithing' || kindParam === 'individual'
          ? kindParam
          : 'tithing';
    initial = {
      memberId: member?.id ?? null,
      kind,
      interviewer: 'nick',
      startsLocal: '',
      durationMinutes: 30,
      mode: 'in_person',
      onlineLink: '',
    };
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <Link href="/interviews" className="text-sm text-blue-700 underline">
          {t('interviews.form.back')}
        </Link>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
      <InterviewForm
        members={members}
        timeZone={unit.timezone}
        initial={initial}
        rescheduleId={rescheduleId ?? undefined}
      />
    </section>
  );
}
