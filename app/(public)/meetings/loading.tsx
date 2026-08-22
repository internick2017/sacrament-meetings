import { getT } from '@/lib/i18n/server';

export default async function MeetingsLoading() {
  const t = await getT();

  return <p className="text-slate-500">{t('list.loading')}</p>;
}
