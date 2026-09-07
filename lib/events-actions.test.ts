import { describe, it, expect, vi, beforeEach } from 'vitest';

// These actions must get the ordering right: addEventAction resolves the
// organization BEFORE asking permission (so a leader cannot probe another
// organization's key before we know which one it is), and
// updateEventAction/deleteEventAction resolve the activity's CURRENT
// organization before asking permission at all (so a leader cannot act on
// another organization's activity by guessing its id). updateEventAction
// additionally must check permission on BOTH the current and the submitted
// organization when the form moves an activity between organizations, which
// is the defect a reviewer is most likely to find if it is missing.
// Everything is mocked at the boundary (authz, the db reads/writes,
// next/cache, i18n) so these tests prove the ordering and error handling
// without a real database or session. NotAuthorizedError is the real class
// from lib/authz-rules.ts (which lib/authz.ts re-exports), not a local
// stand-in, so the catch block is proven to match the class the real module
// throws.
vi.mock('./authz', async () => {
  const { NotAuthorizedError } = await import('./authz-rules');
  return {
    requireLeaderOf: vi.fn(),
    NotAuthorizedError,
    getSessionUser: vi.fn().mockResolvedValue(null),
  };
});
vi.mock('./organizations-db', () => ({
  getOrganizationIdByKey: vi.fn(),
}));
vi.mock('./events-db', () => ({
  addEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  getEventOrganizationId: vi.fn(),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));
// redirect() throws NEXT_REDIRECT in real Next.js; mocked as a plain spy
// here since these tests only need to assert it was called with the right
// path, not exercise the real navigation short-circuit.
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));
vi.mock('./i18n/server', () => ({
  getT: vi.fn().mockResolvedValue((key: string) => key),
}));
// updateEventAction and addEventAction now convert the submitted naive
// local time using the congregation's timezone (see lib/timezone.ts), which
// means they read the unit. Mocked here so these tests stay a pure
// unit/permission-ordering check, independent of that conversion (which has
// its own dedicated tests in lib/timezone.test.ts).
vi.mock('./unit-db', () => ({
  getUnit: vi.fn().mockResolvedValue({ timezone: 'America/Sao_Paulo' }),
}));

import { requireLeaderOf, NotAuthorizedError } from './authz';
import { getOrganizationIdByKey } from './organizations-db';
import { addEvent, updateEvent, deleteEvent, getEventOrganizationId } from './events-db';
import { redirect } from 'next/navigation';
import { addEventAction, updateEventAction, deleteEventAction } from './events-actions';

const mockRequireLeaderOf = vi.mocked(requireLeaderOf);
const mockGetOrganizationIdByKey = vi.mocked(getOrganizationIdByKey);
const mockAddEvent = vi.mocked(addEvent);
const mockUpdateEvent = vi.mocked(updateEvent);
const mockDeleteEvent = vi.mocked(deleteEvent);
const mockGetEventOrganizationId = vi.mocked(getEventOrganizationId);
const mockRedirect = vi.mocked(redirect);

function formWithId(id: number): FormData {
  const fd = new FormData();
  fd.set('id', String(id));
  return fd;
}

const baseValues = {
  organizationKey: 'relief_society',
  title: 'Noche de hogar',
  description: '',
  location: 'Capilla',
  startsAt: '2026-10-02T19:00',
  endsAt: '',
  audience: 'public',
};

function formWithValues(values: Record<string, string>, id?: number): FormData {
  const fd = new FormData();
  if (id !== undefined) {
    fd.set('id', String(id));
  }
  for (const [key, value] of Object.entries(values)) {
    fd.set(key, value);
  }
  // allDay omitted: an unchecked checkbox is simply absent from the form.
  return fd;
}

beforeEach(() => {
  mockRequireLeaderOf.mockReset();
  mockGetOrganizationIdByKey.mockReset();
  mockAddEvent.mockReset();
  mockUpdateEvent.mockReset();
  mockDeleteEvent.mockReset();
  mockGetEventOrganizationId.mockReset();
});

describe('addEventAction', () => {
  it('resolves the organization from the submitted key before asking permission with the resolved id', async () => {
    const calls: string[] = [];
    mockGetOrganizationIdByKey.mockImplementation(async (key) => {
      calls.push(`lookup:${key}`);
      return 60;
    });
    mockRequireLeaderOf.mockImplementation(async (organizationId) => {
      calls.push(`permission:${organizationId}`);
      return { id: '1', role: 'leader', organizationId: 60 };
    });

    await addEventAction({}, formWithValues(baseValues));

    expect(calls).toEqual(['lookup:relief_society', 'permission:60']);
    expect(mockRequireLeaderOf).toHaveBeenCalledWith(60);
    expect(mockAddEvent).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 60 }),
      null
    );
  });

  it('resolves an empty organizationKey to null (branch-wide) before asking permission', async () => {
    mockRequireLeaderOf.mockResolvedValue({ id: '1', role: 'admin', organizationId: null });

    await addEventAction({}, formWithValues({ ...baseValues, organizationKey: '' }));

    expect(mockGetOrganizationIdByKey).not.toHaveBeenCalled();
    expect(mockRequireLeaderOf).toHaveBeenCalledWith(null);
    expect(mockAddEvent).toHaveBeenCalledWith(expect.objectContaining({ organizationId: null }), null);
  });

  it('swallows NotAuthorizedError and does not write', async () => {
    mockGetOrganizationIdByKey.mockResolvedValue(60);
    mockRequireLeaderOf.mockRejectedValue(new NotAuthorizedError());

    const result = await addEventAction({}, formWithValues(baseValues));

    expect(result.message).toBe('admin.notAllowed');
    expect(mockAddEvent).not.toHaveBeenCalled();
  });
});

describe('deleteEventAction', () => {
  it('resolves the organization before asking permission, then acts', async () => {
    const calls: string[] = [];
    mockGetEventOrganizationId.mockImplementation(async () => {
      calls.push('lookup');
      return 30;
    });
    mockRequireLeaderOf.mockImplementation(async () => {
      calls.push('permission');
      return { id: '1', role: 'leader', organizationId: 30 };
    });

    await deleteEventAction(formWithId(5));

    expect(calls).toEqual(['lookup', 'permission']);
    expect(mockGetEventOrganizationId).toHaveBeenCalledWith(5);
    expect(mockRequireLeaderOf).toHaveBeenCalledWith(30);
    expect(mockDeleteEvent).toHaveBeenCalledWith(5);
  });

  it('returns silently, without checking permission, when the activity does not exist', async () => {
    mockGetEventOrganizationId.mockResolvedValue(undefined);

    await deleteEventAction(formWithId(999));

    expect(mockRequireLeaderOf).not.toHaveBeenCalled();
    expect(mockDeleteEvent).not.toHaveBeenCalled();
  });

  it('swallows NotAuthorizedError instead of letting it escape as a 500', async () => {
    mockGetEventOrganizationId.mockResolvedValue(30);
    mockRequireLeaderOf.mockRejectedValue(new NotAuthorizedError());

    await expect(deleteEventAction(formWithId(5))).resolves.toBeUndefined();
    expect(mockDeleteEvent).not.toHaveBeenCalled();
  });
});

describe('updateEventAction', () => {
  it('returns silently when the activity does not exist, without checking permission', async () => {
    mockGetEventOrganizationId.mockResolvedValue(undefined);

    await updateEventAction({}, formWithValues(baseValues, 999));

    expect(mockRequireLeaderOf).not.toHaveBeenCalled();
    expect(mockUpdateEvent).not.toHaveBeenCalled();
  });

  it('checks permission on both organizations when the form moves the activity, and only then writes', async () => {
    // Activity currently belongs to org 10; the form submits org 20.
    const calls: string[] = [];
    mockGetEventOrganizationId.mockImplementation(async () => {
      calls.push('lookup-current');
      return 10;
    });
    mockGetOrganizationIdByKey.mockImplementation(async (key) => {
      calls.push(`lookup-new:${key}`);
      return 20;
    });
    mockRequireLeaderOf.mockImplementation(async (organizationId) => {
      calls.push(`permission:${organizationId}`);
      return { id: '1', role: 'admin', organizationId: null };
    });

    await updateEventAction(
      {},
      formWithValues({ ...baseValues, organizationKey: 'young_men' }, 7)
    );

    expect(calls).toEqual(['lookup-current', 'lookup-new:young_men', 'permission:10', 'permission:20']);
    expect(mockRequireLeaderOf).toHaveBeenCalledWith(10);
    expect(mockRequireLeaderOf).toHaveBeenCalledWith(20);
    expect(mockUpdateEvent).toHaveBeenCalledWith(7, expect.objectContaining({ organizationId: 20 }));
  });

  it('rejects the move when the caller may edit the current organization but not the new one', async () => {
    mockGetEventOrganizationId.mockResolvedValue(10);
    mockGetOrganizationIdByKey.mockResolvedValue(20);
    mockRequireLeaderOf.mockImplementation(async (organizationId) => {
      if (organizationId === 10) {
        return { id: '1', role: 'leader', organizationId: 10 };
      }
      throw new NotAuthorizedError();
    });

    const result = await updateEventAction(
      {},
      formWithValues({ ...baseValues, organizationKey: 'young_men' }, 7)
    );

    expect(result.message).toBe('admin.notAllowed');
    expect(mockUpdateEvent).not.toHaveBeenCalled();
  });

  it('rejects the move when the caller may edit the new organization but not the current one (stealing another org\'s activity)', async () => {
    mockGetEventOrganizationId.mockResolvedValue(10);
    mockGetOrganizationIdByKey.mockResolvedValue(20);
    mockRequireLeaderOf.mockImplementation(async (organizationId) => {
      if (organizationId === 20) {
        return { id: '1', role: 'leader', organizationId: 20 };
      }
      throw new NotAuthorizedError();
    });

    const result = await updateEventAction(
      {},
      formWithValues({ ...baseValues, organizationKey: 'young_men' }, 7)
    );

    expect(result.message).toBe('admin.notAllowed');
    expect(mockUpdateEvent).not.toHaveBeenCalled();
  });

  it('a leader cannot turn their own activity into a branch-wide one, because requireLeaderOf(null) fails for them', async () => {
    mockGetEventOrganizationId.mockResolvedValue(10);
    mockRequireLeaderOf.mockImplementation(async (organizationId) => {
      if (organizationId === 10) {
        return { id: '1', role: 'leader', organizationId: 10 };
      }
      // organizationId === null: a leader is never the leader of "no
      // organization", so this rejects exactly like the real rule does.
      throw new NotAuthorizedError();
    });

    const result = await updateEventAction(
      {},
      formWithValues({ ...baseValues, organizationKey: '' }, 7)
    );

    expect(mockGetOrganizationIdByKey).not.toHaveBeenCalled();
    expect(result.message).toBe('admin.notAllowed');
    expect(mockUpdateEvent).not.toHaveBeenCalled();
  });

  it('resolves and checks permission before writing when the organization is unchanged', async () => {
    const calls: string[] = [];
    mockGetEventOrganizationId.mockImplementation(async () => {
      calls.push('lookup-current');
      return 10;
    });
    mockGetOrganizationIdByKey.mockImplementation(async () => {
      calls.push('lookup-new');
      return 10;
    });
    mockRequireLeaderOf.mockImplementation(async (organizationId) => {
      calls.push(`permission:${organizationId}`);
      return { id: '1', role: 'leader', organizationId: 10 };
    });

    await updateEventAction({}, formWithValues(baseValues, 7));

    expect(calls[calls.length - 2]).toBe('permission:10');
    expect(calls[calls.length - 1]).toBe('permission:10');
    expect(mockUpdateEvent).toHaveBeenCalledWith(7, expect.objectContaining({ organizationId: 10 }));
  });

  it('redirects to the activity detail page after a successful update, so the form does not show stale values', async () => {
    mockGetEventOrganizationId.mockResolvedValue(10);
    mockGetOrganizationIdByKey.mockResolvedValue(10);
    mockRequireLeaderOf.mockResolvedValue({ id: '1', role: 'leader', organizationId: 10 });

    await updateEventAction({}, formWithValues(baseValues, 7));

    expect(mockRedirect).toHaveBeenCalledWith('/activities/7');
  });
});
