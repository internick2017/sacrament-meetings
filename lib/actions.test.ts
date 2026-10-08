import { describe, it, expect, vi, beforeEach } from 'vitest';

// The meeting actions must hand the database the id of whoever is signed in,
// because that is the only thing the change history is built from. Everything
// is mocked at the boundary so these tests prove the attribution without a
// real database or session.
vi.mock('./authz', async () => {
  const { NotAuthorizedError } = await import('./authz-rules');
  return { requireAdmin: vi.fn(), NotAuthorizedError };
});
vi.mock('./meetings-db', () => ({
  addMeeting: vi.fn().mockResolvedValue(1),
  updateMeeting: vi.fn().mockResolvedValue(true),
  deleteMeeting: vi.fn().mockResolvedValue(true),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn(), notFound: vi.fn() }));
vi.mock('./i18n/server', () => ({
  getT: vi.fn().mockResolvedValue((key: string) => key),
}));

import { createMeeting, updateMeeting, deleteMeeting } from './actions';
import { requireAdmin } from './authz';
import { NotAuthorizedError } from './authz-rules';
import * as db from './meetings-db';

function meetingForm(): FormData {
  const formData = new FormData();
  formData.set('date', '2026-10-11');
  formData.set('meetingType', 'regular');
  return formData;
}

function idForm(id: string): FormData {
  const formData = new FormData();
  formData.set('id', id);
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue({ id: '7', role: 'admin', organizationId: null });
});

describe('meeting actions record who made the change', () => {
  it('passes the signed-in user to addMeeting', async () => {
    await createMeeting({}, meetingForm());
    expect(db.addMeeting).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-10-11' }), 7);
  });

  it('passes the signed-in user to updateMeeting', async () => {
    await updateMeeting(42, {}, meetingForm());
    expect(db.updateMeeting).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ date: '2026-10-11' }),
      7
    );
  });

  it('passes the signed-in user to deleteMeeting', async () => {
    await deleteMeeting(idForm('42'));
    expect(db.deleteMeeting).toHaveBeenCalledWith(42, 7);
  });

  it('records the change as unattributed when the session id is not a number', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'abc', role: 'admin', organizationId: null });
    await deleteMeeting(idForm('42'));
    expect(db.deleteMeeting).toHaveBeenCalledWith(42, null);
  });

  it('writes nothing when the user is not an admin', async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new NotAuthorizedError());
    await createMeeting({}, meetingForm());
    await updateMeeting(42, {}, meetingForm());
    await deleteMeeting(idForm('42'));
    expect(db.addMeeting).not.toHaveBeenCalled();
    expect(db.updateMeeting).not.toHaveBeenCalled();
    expect(db.deleteMeeting).not.toHaveBeenCalled();
  });
});
