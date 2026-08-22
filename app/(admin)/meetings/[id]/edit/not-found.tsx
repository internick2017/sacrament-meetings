import Link from 'next/link';
import { getT } from '@/lib/i18n/server';

// Rendered when the edit page calls notFound() for a missing or invalid id.
export default async function EditMeetingNotFound() {
  const t = await getT();

  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-6">
      <h1 className="text-xl font-bold">{t('meeting.notFoundTitle')}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {t('error.notFoundBody')}
      </p>
      <Link href="/meetings" className="mt-4 inline-block text-sm text-slate-800 underline">
        {t('error.back')}
      </Link>
    </div>
  );
}
