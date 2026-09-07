import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/authz';
import { getPendingPhotos } from '@/lib/event-photos-db';
import { getT } from '@/lib/i18n/server';
import type { DictionaryKey } from '@/lib/i18n';
import PendingPhotoRowActions from '@/components/PendingPhotoRowActions';

export default async function PendingPhotosPage() {
  const [sessionUser, t] = await Promise.all([getSessionUser(), getT()]);

  // Admin only, same gate as /users. A leader may upload and delete photos
  // of their own activity, but never approve — the approval queue sees
  // pending photos across every organization, which is exactly the
  // asymmetry this phase exists to protect. The query below only runs after
  // this check passes.
  if (sessionUser?.role !== 'admin') {
    redirect('/login');
  }

  const photos = await getPendingPhotos();

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">{t('photos.pendingQueue')}</h1>

      {photos.length === 0 ? (
        <p className="text-slate-600">{t('photos.pendingQueueEmpty')}</p>
      ) : (
        <ul className="space-y-3">
          {photos.map((photo) => (
            <li
              key={photo.id}
              className="flex flex-wrap items-center gap-4 rounded border border-slate-200 p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.caption || t('photos.untitledAlt')}
                className="h-20 w-20 rounded object-cover"
              />
              <div className="flex-1 space-y-1">
                <p className="font-semibold">{photo.eventTitle}</p>
                <p className="text-sm text-slate-600">
                  {photo.organizationKey
                    ? t(`organization.${photo.organizationKey}` as DictionaryKey)
                    : t('activities.branchWide')}
                </p>
                {photo.caption && <p className="text-sm text-slate-600">{photo.caption}</p>}
              </div>
              <PendingPhotoRowActions id={photo.id} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
