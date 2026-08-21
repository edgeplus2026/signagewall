import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { mkdir, mkdtemp, readdir, stat, utimes, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { BusinessException } from '../../common/exceptions/business.exception';
import { TransactionService } from '../../common/services/transaction.service';
import {
  MEDIA_POSTER_MAX_BYTES,
  MEDIA_PROCESSING_LEASE_RENEW_MS,
  MEDIA_PROCESSING_STALE_MS,
  MEDIA_UPLOAD_TEMP_DIR_NAME,
  MEDIA_UPLOAD_TEMP_STALE_MS,
} from './media.constants';
import { MediaService } from './media.service';
import { MediaItemSource, MediaItemStatus } from './schemas/media-item.schema';

/**
 * Covers the disk-staged upload path.
 *
 * The point of that path is a negative: a 200 MB video must reach R2 without
 * ever being read into the heap. That is invisible to a test asserting on
 * results, so these tests assert on *which* storage call was made — streaming
 * `uploadFile` for video, buffered `uploadObject` only for the re-encoded
 * image — and on the temp file being gone afterwards either way.
 */

/** Minimal MP4: `ftyp` at offset 4 is what the signature check looks for. */
const MP4_HEAD = Buffer.concat([
  Buffer.from([0, 0, 0, 0x18]),
  Buffer.from('ftypisom'),
  Buffer.alloc(64),
]);

const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);

describe('MediaService — disk-staged uploads', () => {
  let service: MediaService;
  let r2: {
    isConfigured: jest.Mock;
    buildObjectKey: jest.Mock;
    uploadFile: jest.Mock;
    uploadObject: jest.Mock;
  };
  let repository: {
    create: jest.Mock;
    findById: jest.Mock;
    updateById: jest.Mock;
  };
  let stagingDir: string;

  const createdItem = {
    _id: { toString: () => 'media-1' },
    status: MediaItemStatus.PROCESSING,
    storageKey: 'key',
    mimeType: 'video/mp4',
    name: 'clip.mp4',
    type: 'video',
    parentId: null,
    createdAt: new Date('2026-08-18T12:00:00.000Z'),
    updatedAt: new Date('2026-08-18T12:00:00.000Z'),
  };

  /** Writes bytes where multer would have, and shapes them like multer does. */
  const stageUpload = async (
    name: string,
    bytes: Buffer,
    mimetype: string,
  ): Promise<Express.Multer.File> => {
    const path = join(stagingDir, name);
    await writeFile(path, bytes);

    return {
      path,
      size: bytes.length,
      mimetype,
      originalname: name,
    } as Express.Multer.File;
  };

  beforeEach(async () => {
    stagingDir = await mkdtemp(join(tmpdir(), 'media-upload-spec-'));

    r2 = {
      isConfigured: jest.fn().mockReturnValue(true),
      buildObjectKey: jest.fn().mockReturnValue('org/user/clip.mp4'),
      uploadFile: jest.fn().mockResolvedValue({ size: 1 }),
      uploadObject: jest.fn().mockResolvedValue(undefined),
    };

    repository = {
      create: jest.fn().mockResolvedValue(createdItem),
      findById: jest.fn().mockResolvedValue(createdItem),
      updateById: jest.fn().mockResolvedValue(createdItem),
    };

    service = new MediaService(
      repository as never,
      r2 as never,
      {
        compressOriginalImage: jest
          .fn()
          .mockResolvedValue({ buffer: Buffer.from('webp-bytes') }),
      } as never,
      {} as never,
      {} as TransactionService,
      {
        getOrThrow: jest.fn().mockReturnValue(200 * 1024 * 1024),
        get: jest.fn().mockReturnValue('https://cdn.example.com'),
      } as never,
      { t: jest.fn().mockImplementation((key: string) => key) } as never,
      {} as never,
      {} as never,
      new EventEmitter2(),
    );

    // Thumbnailing is out-of-band and irrelevant here; keep it from running.
    jest
      .spyOn(service as never, 'processMediaItem')
      .mockResolvedValue(undefined as never);
  });

  const upload = (file: Express.Multer.File, poster?: Express.Multer.File) =>
    service.uploadFile('org-1', 'user-1', file, null, poster);

  it('streams a staged video to R2 from disk instead of buffering it', async () => {
    const file = await stageUpload('clip.mp4', MP4_HEAD, 'video/mp4');

    await upload(file);

    expect(r2.uploadFile).toHaveBeenCalledWith(
      'org/user/clip.mp4',
      file.path,
      'video/mp4',
    );
    expect(r2.uploadObject).not.toHaveBeenCalled();
  });

  it('records the size taken from the staged file', async () => {
    const file = await stageUpload('clip.mp4', MP4_HEAD, 'video/mp4');

    await upload(file);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        size: MP4_HEAD.length,
        source: MediaItemSource.LOCAL,
      }),
    );
  });

  it('deletes the staged file once the upload succeeds', async () => {
    const file = await stageUpload('clip.mp4', MP4_HEAD, 'video/mp4');

    await upload(file);

    await expect(stat(file.path)).rejects.toThrow();
  });

  it('deletes the staged file when validation rejects it', async () => {
    // Declared as video, actually PNG bytes — the magic-number check must fail.
    const file = await stageUpload('lie.mp4', PNG_BYTES, 'video/mp4');

    await expect(upload(file)).rejects.toBeInstanceOf(BusinessException);
    await expect(stat(file.path)).rejects.toThrow();
    expect(r2.uploadFile).not.toHaveBeenCalled();
  });

  it('deletes the staged file when the storage call throws', async () => {
    r2.uploadFile.mockRejectedValue(new Error('R2 down'));
    const file = await stageUpload('clip.mp4', MP4_HEAD, 'video/mp4');

    await expect(upload(file)).rejects.toBeInstanceOf(BusinessException);
    await expect(stat(file.path)).rejects.toThrow();
  });

  it('still buffers an image, because re-encoding needs the bytes', async () => {
    const file = await stageUpload('photo.png', PNG_BYTES, 'image/png');

    await upload(file);

    expect(r2.uploadObject).toHaveBeenCalled();
    expect(r2.uploadFile).not.toHaveBeenCalled();
  });

  it('ignores a poster frame above the poster ceiling', async () => {
    const file = await stageUpload('clip.mp4', MP4_HEAD, 'video/mp4');
    const poster = await stageUpload('poster.png', PNG_BYTES, 'image/png');
    // The upload cap is 200 MB; a poster is read into memory, so it has its own.
    poster.size = MEDIA_POSTER_MAX_BYTES + 1;

    await upload(file, poster);

    expect(repository.create).toHaveBeenCalled();
    await expect(stat(poster.path)).rejects.toThrow();
  });
});

describe('MediaService.sweepStaleUploads', () => {
  let service: MediaService;
  let sweepDir: string;

  beforeEach(async () => {
    sweepDir = join(tmpdir(), MEDIA_UPLOAD_TEMP_DIR_NAME);

    service = new MediaService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as TransactionService,
      { getOrThrow: jest.fn().mockReturnValue(1) } as never,
      { t: jest.fn() } as never,
      {} as never,
      {} as never,
      new EventEmitter2(),
    );
  });

  it('removes abandoned staged files and leaves in-flight ones alone', async () => {
    await mkdir(sweepDir, { recursive: true });

    const stale = join(sweepDir, `stale-${String(process.pid)}`);
    const fresh = join(sweepDir, `fresh-${String(process.pid)}`);
    await writeFile(stale, 'x');
    await writeFile(fresh, 'x');

    // Backdate past the staleness window; the fresh one keeps its mtime.
    const old = new Date(Date.now() - MEDIA_UPLOAD_TEMP_STALE_MS - 60_000);
    await utimes(stale, old, old);

    await service.sweepStaleUploads();

    const remaining = await readdir(sweepDir);
    expect(remaining).not.toContain(`stale-${String(process.pid)}`);
    expect(remaining).toContain(`fresh-${String(process.pid)}`);
  });
});

/**
 * The processing lease.
 *
 * `findStuckProcessing` reads `updatedAt` as "when someone last worked on this",
 * and nothing wrote to the document between accepting an upload and finishing
 * it. A pass slower than the stale window therefore looked abandoned while it
 * was still running, and the 30-second sweep started a second one on top of it —
 * measured, a 4K re-encode takes 71s against a 60s window, and
 * `processingAttempts` counts only failures, so nothing stopped it repeating.
 */
describe('MediaService — processing lease', () => {
  let service: MediaService;
  let touchProcessing: jest.Mock;
  let generateImageThumbnails: jest.Mock;

  const processingItem = {
    _id: { toString: () => 'media-1' },
    organizationId: { toString: () => 'org-1' },
    uploadedBy: { toString: () => 'user-1' },
    mimeType: 'image/png',
    status: MediaItemStatus.PROCESSING,
    processingAttempts: 0,
  };

  /** Runs the real (private) pass; the spec fixture above mocks it out. */
  const runPass = (): Promise<void> =>
    (
      service as unknown as {
        processMediaItem: (item: unknown, source: unknown) => Promise<void>;
      }
    ).processMediaItem(processingItem, {
      buffer: Buffer.from('bytes'),
      mimeType: 'image/png',
    });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    touchProcessing = jest.fn().mockResolvedValue(undefined);
    generateImageThumbnails = jest.fn();

    service = new MediaService(
      {
        touchProcessing,
        updateById: jest.fn().mockResolvedValue(undefined),
      } as never,
      { deleteObjects: jest.fn().mockResolvedValue(undefined) } as never,
      { generateImageThumbnails } as never,
      {} as never,
      {} as TransactionService,
      { getOrThrow: jest.fn(), get: jest.fn() } as never,
      { t: jest.fn() } as never,
      {} as never,
      {} as never,
      new EventEmitter2(),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('renews the lease while a pass is still running', async () => {
    let fail!: (error: Error) => void;
    generateImageThumbnails.mockReturnValue(
      new Promise((_resolve, reject) => {
        fail = reject;
      }),
    );

    const pass = runPass();

    expect(touchProcessing).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(MEDIA_PROCESSING_LEASE_RENEW_MS);
    expect(touchProcessing).toHaveBeenCalledTimes(1);
    expect(touchProcessing).toHaveBeenCalledWith('media-1');

    await jest.advanceTimersByTimeAsync(MEDIA_PROCESSING_LEASE_RENEW_MS);
    expect(touchProcessing).toHaveBeenCalledTimes(2);

    fail(new Error('thumbnailing failed'));
    await pass;
  });

  it('renews often enough that the sweep never sees the item as stale', () => {
    // Two renewals may be lost before anybody else can take the work over.
    expect(MEDIA_PROCESSING_LEASE_RENEW_MS * 2).toBeLessThan(
      MEDIA_PROCESSING_STALE_MS,
    );
  });

  it('stops renewing once the pass is over', async () => {
    let fail!: (error: Error) => void;
    generateImageThumbnails.mockReturnValue(
      new Promise((_resolve, reject) => {
        fail = reject;
      }),
    );

    const pass = runPass();
    await jest.advanceTimersByTimeAsync(MEDIA_PROCESSING_LEASE_RENEW_MS);
    fail(new Error('thumbnailing failed'));
    await pass;

    const renewalsAtFinish = touchProcessing.mock.calls.length;
    await jest.advanceTimersByTimeAsync(MEDIA_PROCESSING_LEASE_RENEW_MS * 5);

    expect(touchProcessing).toHaveBeenCalledTimes(renewalsAtFinish);
  });
});
