import { getT } from '@/lib/i18n/server';

// The author's own site. A plain constant rather than a dictionary key: it is
// a URL, not something that gets translated, and keeping it out of the three
// dictionaries means it can never drift between them.
const AUTHOR_URL = 'https://nickgranados.com';
const AUTHOR_NAME = 'Nick Granados';

export default async function Footer() {
  const t = await getT();

  return (
    <footer className="no-print mt-12 border-t border-slate-200 py-6 text-center text-sm text-slate-500">
      <p>{t('footer.text')}</p>
      <p className="mt-1">
        {t('footer.madeBy')}{' '}
        {/* rel="noopener" because the link opens in a new tab: without it the
            opened page can reach back through window.opener. */}
        <a
          href={AUTHOR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-700"
        >
          {AUTHOR_NAME}
        </a>
      </p>
    </footer>
  );
}
