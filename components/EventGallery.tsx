import type { EventPhoto } from '@/lib/types';
import type { Translator } from '@/lib/i18n';
import PhotoUploadForm from './PhotoUploadForm';
import PhotoDeleteButton from './PhotoDeleteButton';

// An activity's photo gallery. Only ever rendered from a page that has
// already confirmed there is a session (the spec puts galleries entirely
// behind login, even for an otherwise public activity) — this component
// itself does not check for one.
//
// `photos` is whatever the caller already fetched: approved-only for a
// plain member, or approved-plus-pending (via getEventPhotos's
// includeUnapproved) for whoever can edit the activity. That choice is made
// once by the page, not here, so this component has no way to accidentally
// show more than it was given.
export default function EventGallery({
  eventId,
  photos,
  canEdit,
  photoUploadEnabled,
  willNeedApproval,
  t,
}: {
  eventId: number;
  photos: EventPhoto[];
  // Whoever can edit the activity also sees unapproved photos (marked
  // pending) and the upload form. Everyone else with a session sees only
  // the approved ones, already filtered by the caller.
  canEdit: boolean;
  photoUploadEnabled: boolean;
  willNeedApproval: boolean;
  t: Translator;
}) {
  // No photos, no section: not even a heading or an empty box. The upload
  // form (when offered) still needs somewhere to live, so this only skips
  // rendering entirely when there is nothing at all to show — no photos AND
  // no form to offer.
  const showUploadForm = canEdit && photoUploadEnabled;
  if (photos.length === 0 && !showUploadForm) {
    return null;
  }

  return (
    <section className="space-y-4">
      {photos.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xl font-bold">{t('photos.title')}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo) => (
              <li key={photo.id} className="space-y-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption}
                  className="h-32 w-full rounded object-cover"
                />
                {photo.caption && <p className="text-sm text-slate-600">{photo.caption}</p>}
                {!photo.approved && (
                  <p className="text-xs font-semibold text-amber-700">{t('photos.pending')}</p>
                )}
                {canEdit && <PhotoDeleteButton id={photo.id} />}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showUploadForm && (
        <PhotoUploadForm eventId={eventId} willNeedApproval={willNeedApproval} t={t} />
      )}
    </section>
  );
}
