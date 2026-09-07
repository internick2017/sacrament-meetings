import type { ReactNode } from 'react';
import type { Announcement } from '@/lib/types';
import type { Translator, DictionaryKey } from '@/lib/i18n';

// Pure display: renders whatever announcements it is given, in the order
// received. The caller decides what to fetch (in-force only for the home
// page, everything including expired for administration) and whether to
// show the "expired" badge. `renderActions`, when given, is rendered per
// row (the administration screen's edit link and delete button); the home
// page passes nothing, since a visitor cannot act on an announcement.
export default function AnnouncementList({
  announcements,
  t,
  showExpired = false,
  renderActions,
}: {
  announcements: Announcement[];
  t: Translator;
  showExpired?: boolean;
  renderActions?: (announcement: Announcement) => ReactNode;
}) {
  // Today as a 'YYYY-MM-DD' string, comparable directly against endsOn: a
  // validity window is a calendar day, not an instant (same rule as
  // currentFilter() in announcements-db.ts), so this must never go through
  // Date arithmetic.
  const today = new Date().toISOString().slice(0, 10);

  return (
    <ul className="space-y-4">
      {announcements.map((announcement) => {
        const isExpired = announcement.endsOn < today;
        return (
          <li
            key={announcement.id}
            className="space-y-1 rounded border border-slate-200 px-4 py-3 text-left"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{announcement.title}</h3>
              {showExpired && isExpired && (
                <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                  {t('announcements.expired')}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">
              {announcement.organizationKey
                ? t(`organization.${announcement.organizationKey}` as DictionaryKey)
                : t('announcements.unitWide')}
            </p>
            <p className="whitespace-pre-line text-slate-700">{announcement.body}</p>
            <p className="text-sm text-slate-500">
              {t('announcements.until')}: {announcement.endsOn}
            </p>
            {renderActions && <div className="pt-1">{renderActions(announcement)}</div>}
          </li>
        );
      })}
    </ul>
  );
}
