import { PptxRenderService } from './pptx-render.service';
import type { R2StorageService } from './r2-storage.service';

// Mock the external-tool + fs + image dependencies so the test exercises the
// orchestration (download → rasterize → sort → encode → upload) without poppler.
jest.mock('child_process', () => ({
  execFile: (
    _cmd: string,
    _args: string[],
    _opts: unknown,
    cb: (err: unknown, out: { stdout: string; stderr: string }) => void,
  ) => cb(null, { stdout: '', stderr: '' }),
}));

jest.mock('fs/promises', () => ({
  mkdtemp: () => Promise.resolve('/tmp/pptx-render-test'),
  writeFile: () => Promise.resolve(),
  // Deliberately out of order to assert natural (numeric) sorting.
  readdir: () =>
    Promise.resolve(['slide-2.png', 'slide-10.png', 'slide-1.png']),
  readFile: () => Promise.resolve(Buffer.from('png')),
  rm: () => Promise.resolve(),
}));

jest.mock('sharp', () => {
  const chain = {
    rotate: () => chain,
    resize: () => chain,
    webp: () => chain,
    toBuffer: () =>
      Promise.resolve({
        data: Buffer.from('webp'),
        info: { width: 1920, height: 1080 },
      }),
  };
  return jest.fn(() => chain);
});

const uploadObject = jest.fn(() => Promise.resolve());
const getPublicUrl = jest.fn((key: string) => `https://cdn.example/${key}`);
const deleteObjects = jest.fn(() => Promise.resolve());
const isConfigured = jest.fn(() => true);
const hasPublicUrl = jest.fn(() => true);

function makeR2(): R2StorageService {
  return {
    isConfigured,
    hasPublicUrl,
    uploadObject,
    getPublicUrl,
    deleteObjects,
  } as unknown as R2StorageService;
}

function mockPdfFetch(): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: () => null },
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  }) as never;
}

beforeEach(() => {
  jest.clearAllMocks();
  isConfigured.mockReturnValue(true);
  hasPublicUrl.mockReturnValue(true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('PptxRenderService', () => {
  it('renders slides in numeric order and uploads each as WebP', async () => {
    mockPdfFetch();
    const service = new PptxRenderService(makeR2());

    const result = await service.render({
      accessToken: 'tok',
      driveId: 'drive1',
      itemId: 'item1',
      keyPrefix: 'pfx',
    });

    // slide-1, slide-2, slide-10 → 000, 001, 002 (numeric, not lexical, sort).
    expect(result.slideKeys).toEqual([
      'pfx/slide-000.webp',
      'pfx/slide-001.webp',
      'pfx/slide-002.webp',
    ]);
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
    expect(uploadObject).toHaveBeenCalledTimes(3);
    expect(uploadObject).toHaveBeenCalledWith(
      'pfx/slide-000.webp',
      expect.any(Buffer),
      'image/webp',
    );
  });

  it('throws when R2 storage is not configured', async () => {
    isConfigured.mockReturnValue(false);
    const service = new PptxRenderService(makeR2());

    await expect(
      service.render({
        accessToken: 'tok',
        driveId: 'd',
        itemId: 'i',
        keyPrefix: 'p',
      }),
    ).rejects.toThrow(/not configured/);
  });

  it('registers itself as the renderer on module init', () => {
    const service = new PptxRenderService(makeR2());
    expect(() => service.onModuleInit()).not.toThrow();
    expect(service.isConfigured()).toBe(true);
  });

  /*
   * Write credentials without `R2_PUBLIC_URL`: the old gate asked only whether
   * the client existed, so a deck was downloaded, rasterized, encoded and
   * uploaded before anything noticed that not one slide could be addressed.
   * Fail at the door instead, on the message that names the cause.
   */
  it('refuses to render when R2 has no public URL, before doing any work', async () => {
    hasPublicUrl.mockReturnValue(false);
    mockPdfFetch();
    const service = new PptxRenderService(makeR2());

    await expect(
      service.render({
        accessToken: 'tok',
        driveId: 'd',
        itemId: 'i',
        keyPrefix: 'p',
      }),
    ).rejects.toThrow(/not configured/);

    expect(service.isConfigured()).toBe(false);
    expect(uploadObject).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
