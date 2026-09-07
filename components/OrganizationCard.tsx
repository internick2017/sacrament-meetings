import Link from 'next/link';
import type { OrganizationWithCallings } from '@/lib/types';
import type { Translator } from '@/lib/i18n';
import type { DictionaryKey } from '@/lib/i18n';

export default function OrganizationCard({
  organization,
  t,
  showNames,
}: {
  organization: OrganizationWithCallings;
  t: Translator;
  showNames: boolean;
}) {
  const nameKey = `organization.${organization.key}` as DictionaryKey;

  return (
    <section className="rounded border border-slate-200 p-4">
      <h2 className="text-lg font-semibold">
        <Link href={`/organizations/${organization.key}`} className="hover:underline">
          {t(nameKey)}
        </Link>
      </h2>

      {organization.callings.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{t('organizations.noCallings')}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {organization.callings.map((calling) => (
            <li key={calling.id} className="flex flex-wrap items-center gap-x-2 text-sm">
              {/* Photo only ever renders with the name it belongs to
                  (showNames), following organizations-db.ts's hideNames():
                  personPhotoUrl is stripped from the public layer by that
                  same function, so this is a second line of defence, not
                  the only one. Many people will have no photo at all — a
                  plain initial next to a face is the intended look, not a
                  broken one. */}
              {showNames &&
                (calling.personPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- external Blob URL, not a local asset next/image can optimize.
                  <img
                    src={calling.personPhotoUrl}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-500"
                  >
                    {(calling.personName ?? '?').charAt(0).toUpperCase()}
                  </span>
                ))}
              <span className="font-medium">{calling.title}</span>
              {/* A separator that is actually announced keeps this two distinct
                  phrases for a screen reader, instead of "Bishop Contact the
                  bishopric" running together as one. aria-hidden would remove
                  it from the accessibility tree and defeat the point. */}
              <span className="text-slate-400">&mdash;</span>
              {/* Without a session the name is absent by design, and the row
                  points at the bishopric instead of showing a blank. */}
              <span className="text-slate-600">
                {showNames && calling.personName
                  ? calling.personName
                  : t('organizations.contactBishopric')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
