'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { t } from '@/lib/i18n/en';

export default function Pagination({ totalPages }: { totalPages: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = Math.max(1, Number(searchParams.get('page')) || 1);

  // Build a link to another page while preserving the active search query.
  function hrefForPage(page: number): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    return `${pathname}?${params.toString()}`;
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const linkClass =
    'rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100';
  const disabledClass =
    'rounded border border-slate-200 px-3 py-1 text-sm text-slate-300';

  return (
    <nav
      aria-label={t('pagination.label')}
      className="mt-6 flex items-center justify-between"
    >
      {hasPrev ? (
        <Link href={hrefForPage(currentPage - 1)} className={linkClass}>
          {t('pagination.previous')}
        </Link>
      ) : (
        <span className={disabledClass} aria-disabled="true">
          {t('pagination.previous')}
        </span>
      )}

      <span className="text-sm text-slate-600">
        {t('pagination.page')} {currentPage} / {totalPages}
      </span>

      {hasNext ? (
        <Link href={hrefForPage(currentPage + 1)} className={linkClass}>
          {t('pagination.next')}
        </Link>
      ) : (
        <span className={disabledClass} aria-disabled="true">
          {t('pagination.next')}
        </span>
      )}
    </nav>
  );
}
