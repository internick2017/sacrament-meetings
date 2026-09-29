import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./authz', async () => {
  const { NotAuthorizedError } = await import('./authz-rules');
  return { requireAdmin: vi.fn(), NotAuthorizedError };
});
vi.mock('./members-db', () => ({ replaceMembers: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('./i18n/server', () => ({
  getT: vi.fn().mockResolvedValue((key: string) => key),
}));

import { requireAdmin, NotAuthorizedError } from './authz';
import { replaceMembers } from './members-db';
import { saveRosterAction } from './members-actions';

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockReplaceMembers = vi.mocked(replaceMembers);

function formWith(names: string): FormData {
  const fd = new FormData();
  fd.set('names', names);
  return fd;
}

describe('saveRosterAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ id: '1', role: 'admin', organizationId: null });
  });

  it('refuses a non-admin before touching the roster', async () => {
    mockRequireAdmin.mockRejectedValue(new NotAuthorizedError());

    const state = await saveRosterAction({}, formWith('Ana Souza'));

    expect(state.message).toBe('admin.notAllowed');
    expect(mockReplaceMembers).not.toHaveBeenCalled();
  });

  it('saves the cleaned list', async () => {
    const state = await saveRosterAction({}, formWith(' Ana  Souza\nana souza\nBruno Alves'));

    expect(mockReplaceMembers).toHaveBeenCalledWith(['Ana Souza', 'Bruno Alves']);
    expect(state.saved).toBe(true);
  });

  it('rejects an overlong name, echoing the text and saving nothing', async () => {
    const text = `Ana\n${'a'.repeat(121)}`;

    const state = await saveRosterAction({}, formWith(text));

    expect(state.errors?.names).toEqual(['validation.roster.tooLong']);
    expect(state.values).toEqual({ names: text });
    expect(mockReplaceMembers).not.toHaveBeenCalled();
  });
});
