import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// @vercel/blob's put() is mocked so these tests never touch the network or
// require a real BLOB_READ_WRITE_TOKEN — this project's machine does not
// have one, and coverUploadEnabled is read at module load, from
// process.env, so it is set with vi.stubEnv before each dynamic import.
const mockPut = vi.fn();
const mockDel = vi.fn();
vi.mock('@vercel/blob', () => ({
  put: mockPut,
  del: mockDel,
}));

function makeFile(name: string, type: string, sizeBytes: number): File {
  // A File's declared size is driven by its content length, so build a
  // buffer of the requested size rather than trying to set `.size` directly
  // (which is read-only).
  const content = new Uint8Array(sizeBytes);
  return new File([content], name, { type });
}

beforeEach(() => {
  vi.resetModules();
  mockPut.mockReset();
  mockDel.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('uploadCover', () => {
  it('coverUploadEnabled is false and uploadCover returns null when there is no token', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', '');
    const { uploadCover, coverUploadEnabled } = await import('./blob');

    expect(coverUploadEnabled).toBe(false);

    const file = makeFile('cover.jpg', 'image/jpeg', 1000);
    const result = await uploadCover(file);

    expect(result).toBeNull();
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('returns null for a null file without calling put', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'fake-token');
    const { uploadCover } = await import('./blob');

    expect(await uploadCover(null)).toBeNull();
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('rejects a disallowed file type before ever calling put', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'fake-token');
    const { uploadCover } = await import('./blob');

    const file = makeFile('cover.gif', 'image/gif', 1000);
    const result = await uploadCover(file);

    expect(result).toBeNull();
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('rejects a file over the size limit before ever calling put', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'fake-token');
    const { uploadCover } = await import('./blob');

    const tooBig = 4 * 1024 * 1024 + 1;
    const file = makeFile('cover.jpg', 'image/jpeg', tooBig);
    const result = await uploadCover(file);

    expect(result).toBeNull();
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('never throws when put() rejects, returning null instead', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'fake-token');
    mockPut.mockRejectedValue(new Error('network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { uploadCover } = await import('./blob');

    const file = makeFile('cover.jpg', 'image/jpeg', 1000);
    await expect(uploadCover(file)).resolves.toBeNull();

    consoleSpy.mockRestore();
  });

  it('returns the public url on a successful upload', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'fake-token');
    mockPut.mockResolvedValue({ url: 'https://example.public.blob.vercel-storage.com/cover.jpg' });
    const { uploadCover } = await import('./blob');

    const file = makeFile('cover.jpg', 'image/jpeg', 1000);
    const result = await uploadCover(file);

    expect(result).toBe('https://example.public.blob.vercel-storage.com/cover.jpg');
    expect(mockPut).toHaveBeenCalledWith(
      expect.stringMatching(/^activities\//),
      file,
      expect.objectContaining({ access: 'public', contentType: 'image/jpeg' })
    );
  });
});

describe('deleteCover', () => {
  it('does nothing and never calls del() when the url is null', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'fake-token');
    const { deleteCover } = await import('./blob');

    await deleteCover(null);

    expect(mockDel).not.toHaveBeenCalled();
  });

  it('does nothing when there is no upload credential, even with a url', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', '');
    const { deleteCover } = await import('./blob');

    await deleteCover('https://example.public.blob.vercel-storage.com/cover.jpg');

    expect(mockDel).not.toHaveBeenCalled();
  });

  it('calls del() with the given url when enabled', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'fake-token');
    mockDel.mockResolvedValue(undefined);
    const { deleteCover } = await import('./blob');

    await deleteCover('https://example.public.blob.vercel-storage.com/cover.jpg');

    expect(mockDel).toHaveBeenCalledWith('https://example.public.blob.vercel-storage.com/cover.jpg');
  });

  // The whole point of deleteCover: a failure to remove the old file must
  // never surface as a thrown error, which would fail the leader's edit or
  // delete action.
  it('never throws when del() rejects', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'fake-token');
    mockDel.mockRejectedValue(new Error('network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { deleteCover } = await import('./blob');

    await expect(
      deleteCover('https://example.public.blob.vercel-storage.com/cover.jpg')
    ).resolves.toBeUndefined();

    consoleSpy.mockRestore();
  });
});
