import { getLocale, getT } from '@/lib/i18n/server';
import { formatEventDateTime, type DictionaryKey } from '@/lib/i18n';
import { getUnit } from '@/lib/unit-db';
import type { MeetingChange, MeetingChangeAction } from '@/lib/meetings-db';

const ACTION_LABELS: Record<MeetingChangeAction, DictionaryKey> = {
  created: 'meeting.history.created',
  updated: 'meeting.history.updated',
  deleted: 'meeting.history.deleted',
};

// Who created and edited a meeting, newest first. It names accounts, so it is
// only ever rendered on an admin-only page.
export default async function MeetingHistory({ changes }: { changes: MeetingChange[] }) {
  const [t, locale, unit] = await Promise.all([getT(), getLocale(), getUnit()]);

  return (
    <section className="mt-8 border-t border-slate-200 pt-4">
      <h2 className="text-lg font-semibold">{t('meeting.history.title')}</h2>
      {changes.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">{t('meeting.history.empty')}</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          {changes.map((change) => (
            <li key={change.id}>
              {t(ACTION_LABELS[change.action], {
                who: change.changedBy ?? t('meeting.history.unknownUser'),
              })}
              <span className="text-slate-500">
                {' · '}
                {formatEventDateTime(change.changedAt, false, locale, unit.timezone)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
