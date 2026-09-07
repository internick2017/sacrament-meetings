import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getT } from '@/lib/i18n/server';
import { getOrganizationByKey } from '@/lib/organizations-db';
import OrganizationCard from '@/components/OrganizationCard';

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // In Next.js 16 params is async: it must be awaited before use.
  const { slug } = await params;
  const [session, t] = await Promise.all([auth(), getT()]);
  const showNames = !!session;

  const organization = await getOrganizationByKey(slug, showNames);
  if (!organization) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <Link href="/organizations" className="text-sm text-slate-600 hover:underline">
        {t('organizations.back')}
      </Link>

      <OrganizationCard organization={organization} t={t} showNames={showNames} />

      {!showNames && (
        <p className="rounded bg-slate-100 px-3 py-2 text-sm text-slate-700">
          {t('organizations.signedOutNote')}
        </p>
      )}
    </div>
  );
}
