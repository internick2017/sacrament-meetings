import Image from 'next/image';
import Link from 'next/link';
import { getT } from '@/lib/i18n/server';

export default async function HomePage() {
  const t = await getT();

  return (
    <section className="flex flex-col items-center gap-6 text-center">
      <Image
        src="/meetinghouse.svg"
        alt={t('home.imageAlt')}
        width={640}
        height={400}
        priority
      />
      <h1 className="text-3xl font-bold">{t('home.heading')}</h1>
      <p className="max-w-xl text-slate-600">{t('home.subheading')}</p>
      <Link
        href="/meetings"
        className="rounded bg-slate-800 px-5 py-2 font-semibold text-white hover:bg-slate-700"
      >
        {t('home.cta')}
      </Link>
    </section>
  );
}
