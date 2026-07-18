'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { t } from '@/lib/i18n/en';

export default function MeetingSearch() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // Debounce so we only rewrite the URL 300ms after the user stops typing,
  // instead of on every keystroke (which would hit the database each time).
  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1'); // a new search always starts on page 1
    if (term) {
      params.set('query', term);
    } else {
      params.delete('query');
    }
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  return (
    <div className="mb-4">
      <label htmlFor="meeting-search" className="sr-only">
        {t('search.label')}
      </label>
      <input
        id="meeting-search"
        type="search"
        aria-label={t('search.label')}
        placeholder={t('search.placeholder')}
        // The URL is the source of truth, so the input is seeded from it with
        // defaultValue (uncontrolled) instead of being bound to React state.
        defaultValue={searchParams.get('query')?.toString() ?? ''}
        onChange={(event) => handleSearch(event.target.value)}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      />
    </div>
  );
}
