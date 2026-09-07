import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/authz';
import { getT } from '@/lib/i18n/server';
import { getAppUserById } from '@/lib/users-db';
import { getPersonById } from '@/lib/people-db';
import { photoUploadEnabled } from '@/lib/blob';
import { ProfilePhotoForm, ProfilePhotoDeleteButton } from '@/components/ProfilePhotoForm';

// /profile: any signed-in account, protected by middleware's matcher (see
// middleware.ts) and, as defence in depth, this redirect — the same
// belt-and-suspenders pattern as the (admin) layout.
//
// The upload form only ever renders when BOTH photoUploadEnabled (a Blob
// credential exists at all) AND user.photoUploadAllowed (the bishopric
// turned it on for this specific account) are true. Either one missing
// shows an explanatory message instead of a form that would silently do
// nothing — a broken-looking screen is worse than an honest one. The two
// messages are deliberately different: one is actionable by the bishopric
// (photoUploadAllowed), the other is not (no Blob credential configured for
// the site at all) — see profile.notAllowed vs photos.uploadDisabled below.
//
// The delete button, however, is NOT gated on canUpload. It renders
// whenever the person already has a photo, independent of whether new
// uploads are currently allowed — matching lib/profile-actions.ts, which
// deliberately never gates deletion on photoUploadAllowed. If the
// bishopric turns the switch off (e.g. after realising the account belongs
// to a minor), or the Blob credential is ever removed, the member must
// still be able to take down a photo they already uploaded. Do not move
// this back inside the canUpload branch.
export default async function ProfilePage() {
  const [sessionUser, t] = await Promise.all([getSessionUser(), getT()]);

  if (!sessionUser) {
    redirect('/login');
  }

  const id = Number(sessionUser.id);
  const user = Number.isInteger(id) ? await getAppUserById(id) : undefined;
  const person = user?.personId != null ? await getPersonById(user.personId) : undefined;

  const canUpload = Boolean(user?.photoUploadAllowed) && photoUploadEnabled;

  return (
    <section className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">{t('profile.title')}</h1>

      {person ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            {person.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external Blob URL, not a local asset next/image can optimize.
              <img
                src={person.photoUrl}
                alt={t('profile.photoAlt')}
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-200 text-2xl font-semibold text-slate-500"
              >
                {person.fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <p className="text-lg font-semibold">{person.fullName}</p>
          </div>

          {canUpload ? (
            <ProfilePhotoForm />
          ) : (
            <p className="rounded bg-slate-100 px-3 py-2 text-sm text-slate-700">
              {photoUploadEnabled ? t('profile.notAllowed') : t('photos.uploadDisabled')}
            </p>
          )}

          {person.photoUrl && <ProfilePhotoDeleteButton />}
        </div>
      ) : (
        <p className="rounded bg-slate-100 px-3 py-2 text-sm text-slate-700">
          {t('profile.noPersonLinked')}
        </p>
      )}
    </section>
  );
}
