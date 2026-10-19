import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./authz', async () => {
  const { NotAuthorizedError } = await import('./authz-rules');
  return { requireAdmin: vi.fn(), NotAuthorizedError };
});
vi.mock('./members-db', () => ({
  planRoster: vi.fn(),
  removedMembersWithData: vi.fn(),
  replaceMembers: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('./i18n/server', () => ({
  getT: vi.fn().mockResolvedValue((key: string) => key),
}));

import { requireAdmin, NotAuthorizedError } from './authz';
import { planRoster, removedMembersWithData, replaceMembers } from './members-db';
import { saveRosterAction } from './members-actions';

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockReplaceMembers = vi.mocked(replaceMembers);
const mockPlanRoster = vi.mocked(planRoster);
const mockRemovedWithData = vi.mocked(removedMembersWithData);

function formWith(names: string): FormData {
  const fd = new FormData();
  fd.set('names', names);
  return fd;
}

describe('saveRosterAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ id: '1', role: 'admin', organizationId: null });
    mockPlanRoster.mockResolvedValue({ toAdd: [], toRemoveIds: [] });
    mockRemovedWithData.mockResolvedValue([]);
  });

  it('refuses a non-admin before touching the roster', async () => {
    mockRequireAdmin.mockRejectedValue(new NotAuthorizedError());

    const state = await saveRosterAction({}, formWith('Ana Souza'));

    expect(state.message).toBe('admin.notAllowed');
    expect(mockReplaceMembers).not.toHaveBeenCalled();
  });

  it('saves the cleaned list', async () => {
    const state = await saveRosterAction({}, formWith(' Ana  Souza\nana souza\nBruno Alves'));

    expect(mockPlanRoster).toHaveBeenCalledWith(['Ana Souza', 'Bruno Alves']);
    expect(mockReplaceMembers).toHaveBeenCalledWith({ toAdd: [], toRemoveIds: [] });
    expect(state.saved).toBe(true);
  });

  it('rejects an overlong name, echoing the text and saving nothing', async () => {
    const text = `Ana\n${'a'.repeat(121)}`;

    const state = await saveRosterAction({}, formWith(text));

    expect(state.errors?.names).toEqual(['validation.roster.tooLong']);
    expect(state.values).toEqual({ names: text });
    expect(mockReplaceMembers).not.toHaveBeenCalled();
  });

  it('rejects an empty list, saving nothing', async () => {
    const state = await saveRosterAction({}, formWith('  \n \n'));

    expect(state.errors?.names).toEqual(['validation.roster.empty']);
    expect(mockPlanRoster).not.toHaveBeenCalled();
    expect(mockReplaceMembers).not.toHaveBeenCalled();
  });

  it('removes members without data without asking', async () => {
    mockPlanRoster.mockResolvedValue({ toAdd: [], toRemoveIds: [7] });

    const state = await saveRosterAction({}, formWith('Ana Souza'));

    expect(mockRemovedWithData).toHaveBeenCalledWith([7]);
    expect(mockReplaceMembers).toHaveBeenCalledWith({ toAdd: [], toRemoveIds: [7] });
    expect(state.saved).toBe(true);
  });

  it('refuses to remove members with data unless the removal is confirmed', async () => {
    mockPlanRoster.mockResolvedValue({ toAdd: [], toRemoveIds: [7, 8] });
    mockRemovedWithData.mockResolvedValue(['Bruno Lima']);

    const state = await saveRosterAction({}, formWith('Ana Souza'));

    expect(mockReplaceMembers).not.toHaveBeenCalled();
    expect(state.saved).toBeUndefined();
    expect(state.removal).toEqual({ names: ['Bruno Lima'], count: 1 });
    expect(state.values).toEqual({ names: 'Ana Souza' });
  });

  it('lists at most 10 of the members that would lose data', async () => {
    const names = Array.from({ length: 12 }, (_, i) => `Pessoa ${i + 1}`);
    mockPlanRoster.mockResolvedValue({ toAdd: [], toRemoveIds: names.map((_, i) => i + 1) });
    mockRemovedWithData.mockResolvedValue(names);

    const state = await saveRosterAction({}, formWith('Ana Souza'));

    expect(state.removal?.names).toEqual(names.slice(0, 10));
    expect(state.removal?.count).toBe(12);
  });

  it('removes members with data when the form carries confirmRemoval=on', async () => {
    mockPlanRoster.mockResolvedValue({ toAdd: [], toRemoveIds: [7, 8] });
    mockRemovedWithData.mockResolvedValue(['Bruno Lima']);
    const fd = formWith('Ana Souza');
    fd.set('confirmRemoval', 'on');

    const state = await saveRosterAction({}, fd);

    expect(mockReplaceMembers).toHaveBeenCalledWith({ toAdd: [], toRemoveIds: [7, 8] });
    expect(state.saved).toBe(true);
  });
});
