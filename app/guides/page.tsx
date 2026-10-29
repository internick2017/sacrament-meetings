import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/authz';
import { getT } from '@/lib/i18n/server';
import { LEADER_GUIDES } from '@/lib/leader-guides';
import NotAllowed from '@/components/NotAllowed';

// /guides: every signed-in role except member. Not in (admin) or
// (interviews) because neither gate fits: secretaries are the main readers,
// and the (admin) layout keeps them out. Middleware also guards this route.
export default async function GuidesPage() {
  const [user, t] = await Promise.all([getSessionUser(), getT()]);

  if (!user) {
    redirect('/login');
  }
  if (user.role === 'member') {
    return <NotAllowed />;
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">{t('guides.title')}</h1>
      <p className="max-w-xl text-slate-600">{t('guides.intro')}</p>
      <ul className="space-y-2">
        {LEADER_GUIDES.map((guide) => (
          <li key={guide.url}>
            <a
              href={guide.url}
              className="text-slate-700 underline hover:text-slate-900"
              target="_blank"
              rel="noopener noreferrer"
            >
              {guide.title}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
