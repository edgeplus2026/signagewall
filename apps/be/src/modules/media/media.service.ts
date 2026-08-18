import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { I18nService } from 'nestjs-i18n';
import { mkdtemp, open, readFile, rm, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';

import { BusinessException } from '../../common/exceptions/business.exception';
import { TransactionService } from '../../common/services/transaction.service';
import { MediaReadyEvent, PlayerEvents } from '../player/player.events';
import {
  AllowedMediaMimeType,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_MEDIA_MIME_TYPES,
  ALLOWED_VIDEO_MIME_TYPES,
  COMPRESSED_IMAGE_EXTENSION,
  COMPRESSED_IMAGE_MIME_TYPE,
  MEDIA_POSTER_MAX_BYTES,
  MEDIA_PROCESSING_MAX_ATTEMPTS,
  MEDIA_PROCESSING_STALE_MS,
  MEDIA_SIGNATURE_HEAD_BYTES,
  TRANSCODED_VIDEO_EXTENSION,
  TRANSCODED_VIDEO_MIME_TYPE,
} from './media.constants';
import { CreateFolderDto } from './dto/create-folder.dto';
import { MediaListQueryDto } from './dto/media-list-query.dto';
import { MoveMediaDto } from './dto/move-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import {
  getPublicBaseUrl,
  MediaItemResponseDto,
  toMediaItemResponse,
} from './mappers/media.mapper';
import { MediaRepository } from './media.repository';
import {
  MediaItemDocument,
  MediaItemSource,
  MediaItemStatus,
  MediaItemType,
} from './schemas/media-item.schema';
import { isBufferConsistentWithMime } from './storage/media-file-signature';
import { MediaThumbnailService } from './storage/media-thumbnail.service';
import { MediaVideoService } from './storage/media-video.service';
import { R2StorageService } from './storage/r2-storage.service';
import { PlaylistsRepository } from '../playlists/playlists.repository';
import { ScreensService } from '../screens/screens.service';

/**
 * Bytes on their way into storage, wherever they currently live.
 *
 * A device upload is staged on disk by multer and streamed to R2 from there, so
 * a 200 MB clip never occupies the heap. A provider import already holds its
 * bytes in memory. Both end up in the same pipeline, and only the three
 * operations below actually care which is which.
 */
export type MediaBytes =
  | { kind: 'buffer'; buffer: Buffer }
  | { kind: 'file'; path: string; size: number };

function mediaBytesSize(bytes: MediaBytes): number {
  return bytes.kind === 'buffer' ? bytes.buffer.length : bytes.size;
}

/** First bytes only — enough to match a magic number, never the whole file. */
async function readMediaBytesHead(
  bytes: MediaBytes,
  length: number,
): Promise<Buffer> {
  if (bytes.kind === 'buffer') {
    return bytes.buffer.subarray(0, length);
  }

  const handle = await open(bytes.path, 'r');
  try {
    const head = Buffer.alloc(length);
    const { bytesRead } = await handle.read(head, 0, length, 0);
    return head.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

/**
 * The whole thing in memory. Only ever called for images, which are bounded by
 * what Sharp has to decode anyway — never for video, which is the entire reason
 * the file variant exists.
 */
async function readMediaBytes(bytes: MediaBytes): Promise<Buffer> {
  return bytes.kind === 'buffer' ? bytes.buffer : readFile(bytes.path);
}

/** What gets written to R2, after images have been re-encoded. */
interface PreparedOriginal {
  name: string;
  mimeType: string;
  size: number;
  body: MediaBytes;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly maxFileSizeBytes: number;

  constructor(
    private readonly mediaRepository: MediaRepository,
    private readonly r2StorageService: R2StorageService,
    private readonly mediaThumbnailService: MediaThumbnailService,
    private readonly mediaVideoService: MediaVideoService,
    private readonly transactionService: TransactionService,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
    private readonly playlistsRepository: PlaylistsRepository,
    @Inject(forwardRef(() => ScreensService))
    private readonly screensService: ScreensService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.maxFileSizeBytes = this.configService.getOrThrow<number>(
      'media.maxFileSizeBytes',
    );
  }

  async list(
    organizationId: string,
    query: MediaListQueryDto,
  ): Promise<MediaItemResponseDto[]> {
    const items = await this.resolveScopedItems(organizationId, query);

    return this.sortByName(this.applyListFilters(items, query)).map((item) =>
      toMediaItemResponse(item, getPublicBaseUrl(this.configService)),
    );
  }

  async listMedia(
    organizationId: string,
    query: MediaListQueryDto,
  ): Promise<MediaItemResponseDto[]> {
    const items = await this.resolveScopedItems(organizationId, query);
    const mediaFiles = items.filter(
      (item) => item.type !== MediaItemType.FOLDER,
    );

    return this.sortByName(
      this.applyListFilters(mediaFiles, {
        ...query,
        foldersOnly: undefined,
      }),
    ).map((item) =>
      toMediaItemResponse(item, getPublicBaseUrl(this.configService)),
    );
  }

  async listFolders(
    organizationId: string,
    parentId: string | null,
  ): Promise<MediaItemResponseDto[]> {
    const folders = await this.mediaRepository.findByParent(
      organizationId,
      parentId,
      MediaItemType.FOLDER,
    );

    return this.sortByName(folders).map((item) =>
      toMediaItemResponse(item, getPublicBaseUrl(this.configService)),
    );
  }

  async getById(
    organizationId: string,
    id: string,
  ): Promise<MediaItemResponseDto> {
    const item = await this.mediaRepository.findById(organizationId, id);

    if (!item) {
      throw BusinessException.notFound(this.i18n.t('media.itemNotFound'));
    }

    return toMediaItemResponse(item, getPublicBaseUrl(this.configService));
  }

  async getDownloadFile(
    organizationId: string,
    id: string,
  ): Promise<{
    stream: Readable;
    filename: string;
    contentType: string;
    contentLength?: number;
  }> {
    const item = await this.mediaRepository.findById(organizationId, id);

    if (!item) {
      throw BusinessException.notFound(this.i18n.t('media.itemNotFound'));
    }

    if (item.type === MediaItemType.FOLDER || !item.storageKey) {
      throw BusinessException.badRequest(
        this.i18n.t('media.downloadNotAllowed'),
      );
    }

    const { stream, contentType, contentLength } =
      await this.r2StorageService.getObjectStream(item.storageKey);

    return {
      stream,
      filename: item.name,
      contentType: contentType ?? item.mimeType ?? 'application/octet-stream',
      contentLength,
    };
  }

  async getFolderPath(
    organizationId: string,
    folderId: string | null,
  ): Promise<MediaItemResponseDto[]> {
    if (!folderId) {
      return [];
    }

    const folder = await this.mediaRepository.findById(
      organizationId,
      folderId,
    );

    if (!folder || folder.type !== MediaItemType.FOLDER) {
      return [];
    }

    const ancestors = await this.mediaRepository.findAncestorFolders(
      organizationId,
      folderId,
    );
    const ancestorMap = new Map(
      ancestors.map((item) => [item._id.toString(), item]),
    );

    // Order the ancestor set root → leaf by walking parent links, then append
    // the folder itself.
    const path: MediaItemDocument[] = [folder];
    let currentId = folder.parentId?.toString() ?? null;

    while (currentId) {
      const current = ancestorMap.get(currentId);

      if (!current) {
        break;
      }

      path.unshift(current);
      currentId = current.parentId?.toString() ?? null;
    }

    return path.map((item) =>
      toMediaItemResponse(item, getPublicBaseUrl(this.configService)),
    );
  }

  async createFolder(
    organizationId: string,
    userId: string,
    dto: CreateFolderDto,
  ): Promise<MediaItemResponseDto> {
    const parentId = dto.parentId ?? null;

    if (parentId) {
      await this.assertFolderExists(organizationId, parentId);
    }

    const duplicate = await this.mediaRepository.findFolderByName(
      organizationId,
      parentId,
      dto.name.trim(),
    );

    if (duplicate) {
      throw BusinessException.conflict(this.i18n.t('media.folderNameExists'));
    }

    const folder = await this.mediaRepository.create({
      organizationId,
      parentId,
      type: MediaItemType.FOLDER,
      name: dto.name.trim(),
      uploadedBy: userId,
      status: MediaItemStatus.READY,
      source: MediaItemSource.LOCAL,
    });

    return toMediaItemResponse(folder, getPublicBaseUrl(this.configService));
  }

  /**
   * A device upload, staged on disk by multer.
   *
   * The staged files are this method's responsibility for exactly as long as it
   * runs: the `finally` removes them whether the upload succeeded, was rejected
   * as invalid, or blew up inside R2. Anything that escapes that — a request
   * the client abandoned mid-body, a size limit multer rejected before this
   * handler was ever reached — is caught later by `sweepStaleUploads`.
   */
  async uploadFile(
    organizationId: string,
    userId: string,
    file: Express.Multer.File,
    parentId: string | null,
    poster?: Express.Multer.File,
    durationSeconds?: number,
  ): Promise<MediaItemResponseDto> {
    try {
      await this.assertValidUploadFile(file);

      const mediaType = this.resolveMediaType(file.mimetype);
      // For videos, the client-captured poster frame (if any) becomes the
      // thumbnail source; images thumbnail their own bytes inside persistAsset.
      const posterSource = await this.resolvePosterSource(mediaType, poster);

      return await this.createMediaFromSource(organizationId, userId, {
        bytes: { kind: 'file', path: file.path, size: file.size },
        mimeType: file.mimetype,
        name: file.originalname,
        source: MediaItemSource.LOCAL,
        parentId,
        ...(durationSeconds !== undefined ? { durationSeconds } : {}),
        ...(posterSource ? { thumbnailSource: posterSource } : {}),
      });
    } finally {
      await this.discardStagedUploads(file, poster);
    }
  }

  /** Removes multer's staged temp files; a failure here is never the caller's. */
  private async discardStagedUploads(
    ...files: (Express.Multer.File | undefined)[]
  ): Promise<void> {
    await Promise.all(
      files.map(async (staged) => {
        if (!staged?.path) return;
        await unlink(staged.path).catch(() => undefined);
      }),
    );
  }

  /**
   * Persists an in-memory asset (image/video bytes) as a first-class media
   * item: validates → stores the original in R2 → kicks off out-of-band
   * thumbnail processing (PROCESSING → READY). Shared by device uploads
   * (source LOCAL) and stock-media imports (source PEXELS), so imported assets
   * are indistinguishable from uploaded ones downstream.
   *
   * `maxSizeBytes` defaults to the user-upload ceiling; importers pass a larger
   * limit since provider videos commonly exceed it. `thumbnailSource` is an
   * optional image (e.g. a video poster/preview frame); when omitted, videos
   * fall back to the neutral placeholder.
   */
  async createMediaFromBuffer(
    organizationId: string,
    userId: string,
    input: {
      buffer: Buffer;
      mimeType: string;
      name: string;
      source: MediaItemSource;
      parentId?: string | null;
      durationSeconds?: number;
      maxSizeBytes?: number;
      thumbnailSource?: { buffer: Buffer; mimeType: string };
      awaitProcessing?: boolean;
    },
  ): Promise<MediaItemResponseDto> {
    const { buffer, ...rest } = input;

    return this.createMediaFromSource(organizationId, userId, {
      ...rest,
      bytes: { kind: 'buffer', buffer },
    });
  }

  /**
   * The shared pipeline, indifferent to where the bytes are.
   *
   * Device uploads arrive as a disk-staged file and are streamed to R2 without
   * ever being read whole; provider imports arrive as a buffer they already
   * hold. Everything after this — validation, image re-encoding, the record,
   * thumbnailing, transcoding — is identical for both.
   */
  async createMediaFromSource(
    organizationId: string,
    userId: string,
    input: {
      bytes: MediaBytes;
      mimeType: string;
      name: string;
      source: MediaItemSource;
      parentId?: string | null;
      durationSeconds?: number;
      maxSizeBytes?: number;
      thumbnailSource?: { buffer: Buffer; mimeType: string };
      awaitProcessing?: boolean;
    },
  ): Promise<MediaItemResponseDto> {
    if (!this.r2StorageService.isConfigured()) {
      throw BusinessException.badRequest(
        this.i18n.t('media.storageNotConfigured'),
      );
    }

    const parentId = input.parentId ?? null;
    const maxSizeBytes = input.maxSizeBytes ?? this.maxFileSizeBytes;

    const originalSize = mediaBytesSize(input.bytes);

    if (originalSize > maxSizeBytes) {
      throw BusinessException.badRequest(this.i18n.t('media.fileTooLarge'));
    }

    if (
      !ALLOWED_MEDIA_MIME_TYPES.includes(
        input.mimeType as (typeof ALLOWED_MEDIA_MIME_TYPES)[number],
      )
    ) {
      throw BusinessException.badRequest(this.i18n.t('media.invalidFileType'));
    }

    // The bytes must match their declared MIME type so nothing can be smuggled
    // in under a falsified content type (applies equally to provider downloads).
    if (
      !isBufferConsistentWithMime(
        await readMediaBytesHead(input.bytes, MEDIA_SIGNATURE_HEAD_BYTES),
        input.mimeType as AllowedMediaMimeType,
      )
    ) {
      throw BusinessException.badRequest(
        this.i18n.t('media.invalidFileContent'),
      );
    }

    if (parentId) {
      await this.assertFolderExists(organizationId, parentId);
    }

    const mediaType = this.resolveMediaType(input.mimeType);
    const videoDuration = this.resolveVideoDuration(
      mediaType,
      input.durationSeconds,
    );

    // Images are re-encoded to WebP (and downscaled) before storage to stay
    // within the R2 free tier; videos pass through untouched (Sharp can't
    // decode video). Both upload paths (device upload and stock import) share
    // this method, so this covers them uniformly.
    const original = await this.prepareOriginal(
      mediaType,
      input.bytes,
      originalSize,
      input.mimeType,
      input.name,
    );

    const storageKey = this.r2StorageService.buildObjectKey(
      organizationId,
      userId,
      original.name,
    );

    const created = await this.mediaRepository.create({
      organizationId,
      parentId,
      type: mediaType,
      name: original.name,
      mimeType: original.mimeType,
      size: original.size,
      storageKey,
      uploadedBy: userId,
      status: MediaItemStatus.PROCESSING,
      source: input.source,
      ...(videoDuration !== undefined
        ? { defaultDuration: videoDuration }
        : {}),
    });

    try {
      await this.uploadOriginal(storageKey, original);
    } catch (error) {
      await this.mediaRepository.updateById(
        organizationId,
        created._id.toString(),
        {
          status: MediaItemStatus.FAILED,
          processingError: 'upload_failed',
        },
      );
      this.logger.error('Failed to upload media file to R2', error);
      throw BusinessException.badRequest(this.i18n.t('media.uploadFailed'));
    }

    // Process thumbnails. For images we thumbnail the asset bytes; for videos
    // we use the supplied poster/preview frame (if any). The original is durably
    // stored in R2, so if this process dies the reconciliation sweep re-drives
    // it — no buffer needs to survive in memory.
    const thumbnailSource =
      mediaType === MediaItemType.IMAGE && original.body.kind === 'buffer'
        ? { buffer: original.body.buffer, mimeType: original.mimeType }
        : input.thumbnailSource;

    if (input.awaitProcessing) {
      await this.processMediaItem(created, thumbnailSource);
    } else {
      void this.processMediaItem(created, thumbnailSource);
    }

    const fresh = await this.mediaRepository.findById(
      organizationId,
      created._id.toString(),
    );

    return toMediaItemResponse(
      fresh ?? created,
      getPublicBaseUrl(this.configService),
    );
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateMediaDto,
  ): Promise<MediaItemResponseDto> {
    const item = await this.mediaRepository.findById(organizationId, id);

    if (!item) {
      throw BusinessException.notFound(this.i18n.t('media.itemNotFound'));
    }

    const trimmedName = dto.name?.trim();

    // Renaming a folder must respect the same per-parent uniqueness as creation.
    if (
      trimmedName &&
      item.type === MediaItemType.FOLDER &&
      trimmedName !== item.name
    ) {
      const duplicate = await this.mediaRepository.findFolderByName(
        organizationId,
        item.parentId?.toString() ?? null,
        trimmedName,
      );

      if (duplicate && duplicate._id.toString() !== id) {
        throw BusinessException.conflict(this.i18n.t('media.folderNameExists'));
      }
    }

    // `defaultDuration` is editable for images only; videos use their actual length.
    if (dto.defaultDuration !== undefined) {
      if (item.type === MediaItemType.FOLDER) {
        throw BusinessException.badRequest(
          this.i18n.t('media.durationNotAllowed'),
        );
      }

      if (item.type === MediaItemType.VIDEO) {
        throw BusinessException.badRequest(
          this.i18n.t('media.videoDurationNotEditable'),
        );
      }
    }

    const updated = await this.mediaRepository.updateById(organizationId, id, {
      ...(trimmedName !== undefined ? { name: trimmedName } : {}),
      ...(dto.defaultDuration !== undefined && item.type === MediaItemType.IMAGE
        ? { defaultDuration: dto.defaultDuration }
        : {}),
    });

    if (!updated) {
      throw BusinessException.notFound(this.i18n.t('media.itemNotFound'));
    }

    return toMediaItemResponse(updated, getPublicBaseUrl(this.configService));
  }

  async move(organizationId: string, dto: MoveMediaDto): Promise<void> {
    const targetFolderId = dto.targetFolderId ?? null;

    if (targetFolderId) {
      await this.assertFolderExists(organizationId, targetFolderId);
    }

    const items = await this.mediaRepository.findByIds(organizationId, dto.ids);

    if (items.length !== dto.ids.length) {
      throw BusinessException.notFound(this.i18n.t('media.itemNotFound'));
    }

    // Reject moving a folder into itself or any of its own descendants.
    for (const item of items) {
      if (item.type !== MediaItemType.FOLDER || !targetFolderId) {
        continue;
      }

      if (targetFolderId === item._id.toString()) {
        throw BusinessException.badRequest(
          this.i18n.t('media.invalidMoveTarget'),
        );
      }

      const descendants = await this.mediaRepository.findDescendants(
        organizationId,
        item._id.toString(),
      );

      if (descendants.some((d) => d._id.toString() === targetFolderId)) {
        throw BusinessException.badRequest(
          this.i18n.t('media.invalidMoveTarget'),
        );
      }
    }

    await this.transactionService.run(async (session) => {
      await this.mediaRepository.updateParent(
        organizationId,
        items.map((item) => item._id.toString()),
        targetFolderId,
        session,
      );
    });
  }

  async delete(organizationId: string, ids: string[]): Promise<void> {
    const items = await this.mediaRepository.findByIds(organizationId, ids);

    if (items.length === 0) {
      return;
    }

    // Collect the selected items plus every descendant of any selected folder.
    const itemsToDelete = new Map<string, MediaItemDocument>();

    for (const item of items) {
      itemsToDelete.set(item._id.toString(), item);

      if (item.type === MediaItemType.FOLDER) {
        const descendants = await this.mediaRepository.findDescendants(
          organizationId,
          item._id.toString(),
        );

        for (const descendant of descendants) {
          itemsToDelete.set(descendant._id.toString(), descendant);
        }
      }
    }

    const storageKeys = [...itemsToDelete.values()].flatMap(
      (item) =>
        [
          item.storageKey,
          item.thumbnailSmallKey,
          item.thumbnailLargeKey,
        ].filter(Boolean) as string[],
    );

    const mediaIdsToPurge = [...itemsToDelete.values()]
      .filter((item) => item.type !== MediaItemType.FOLDER)
      .map((item) => item._id.toString());

    await this.transactionService.run(async (session) => {
      // Drop the media from playlists (recomputing their covers) first, so the
      // follow-up screen-cover refresh sees the playlists' new covers.
      const affectedPlaylistIds =
        await this.playlistsRepository.removeMediaItems(
          organizationId,
          mediaIdsToPurge,
          session,
        );
      await this.screensService.purgeMediaReferences(
        organizationId,
        mediaIdsToPurge,
        session,
      );
      // A screen's cover can mirror a playlist's cover (when its first item is a
      // playlist). If that playlist's cover changed above, re-derive the screen
      // cover so it doesn't keep pointing at the deleted media.
      await this.screensService.refreshPlaylistCovers(
        organizationId,
        affectedPlaylistIds,
        session,
      );
      await this.mediaRepository.deleteMany(
        organizationId,
        [...itemsToDelete.keys()],
        session,
      );
    });

    // R2 cleanup is best-effort and runs after the DB commit; a failure here
    // only leaves orphaned objects (swept separately), never dangling records.
    await this.r2StorageService.deleteObjects(storageKeys);
  }

  /**
   * Erase every media item of an org and its R2 objects — the media half of the
   * organization-deletion cascade. Standalone (no playlist/screen ref cleanup:
   * those collections are being deleted too). R2 purge is best-effort.
   */
  async purgeOrganization(organizationId: string): Promise<void> {
    const items =
      await this.mediaRepository.findAllByOrganization(organizationId);
    if (items.length === 0) {
      return;
    }

    const storageKeys = items.flatMap(
      (item) =>
        [
          item.storageKey,
          item.thumbnailSmallKey,
          item.thumbnailLargeKey,
        ].filter(Boolean) as string[],
    );

    await this.mediaRepository.deleteAllByOrganization(organizationId);
    await this.r2StorageService.deleteObjects(storageKeys);
  }

  /**
   * Re-drives media items stuck in PROCESSING (e.g. the process died, or a
   * transient failure left them un-finished). Invoked by the scheduled
   * reconciliation sweep. Runs globally across organizations.
   */
  async reprocessStuckItems(): Promise<void> {
    if (!this.r2StorageService.isConfigured()) {
      return;
    }

    const staleBefore = new Date(Date.now() - MEDIA_PROCESSING_STALE_MS);
    const stuck = await this.mediaRepository.findStuckProcessing(
      staleBefore,
      MEDIA_PROCESSING_MAX_ATTEMPTS,
      25,
    );

    for (const item of stuck) {
      // No buffer on hand — processMediaItem re-downloads the original from R2.
      await this.processMediaItem(item);
    }
  }

  /**
   * Generates and stores thumbnails for a single media item (one attempt).
   * Idempotent and safe to re-run: on failure it cleans up any thumbnail it
   * uploaded this pass, bumps the attempt counter, and only marks the item
   * FAILED once the retry budget is exhausted — otherwise it stays PROCESSING
   * for the reconciliation sweep to retry.
   */
  private async processMediaItem(
    item: MediaItemDocument,
    thumbnailSource?: { buffer: Buffer; mimeType: string },
  ): Promise<void> {
    const organizationId = item.organizationId.toString();
    const mediaId = item._id.toString();
    const userId = item.uploadedBy?.toString() ?? 'system';
    const uploadedKeys: string[] = [];

    try {
      const isImage = ALLOWED_IMAGE_MIME_TYPES.includes(
        item.mimeType as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
      );

      let thumbnails;
      if (isImage) {
        // Thumbnail the image bytes — supplied inline on upload, otherwise
        // re-downloaded from R2 (reconciliation sweep).
        if (!thumbnailSource && !item.storageKey) {
          throw new Error('Missing storage key for image processing');
        }
        const source = thumbnailSource
          ? thumbnailSource.buffer
          : (await this.r2StorageService.getObject(item.storageKey!)).body;
        const sourceMime = thumbnailSource?.mimeType ?? item.mimeType!;
        thumbnails = await this.mediaThumbnailService.generateImageThumbnails(
          source,
          sourceMime,
        );
      } else if (thumbnailSource) {
        // Video with a real poster frame captured client-side: build genuine
        // thumbnails from it (and pick up the frame's dimensions).
        thumbnails = await this.mediaThumbnailService.generateImageThumbnails(
          thumbnailSource.buffer,
          thumbnailSource.mimeType,
        );
      } else {
        // Video with no poster (e.g. capture failed, or a sweep retry): fall
        // back to the neutral placeholder.
        thumbnails =
          await this.mediaThumbnailService.generateVideoPlaceholder();
      }

      const thumbnailSmallKey = this.r2StorageService.buildThumbnailKey(
        organizationId,
        userId,
        item.name,
        'small',
      );
      const thumbnailLargeKey = this.r2StorageService.buildThumbnailKey(
        organizationId,
        userId,
        item.name,
        'large',
      );

      await this.r2StorageService.uploadObject(
        thumbnailSmallKey,
        thumbnails.small,
        'image/webp',
      );
      uploadedKeys.push(thumbnailSmallKey);

      await this.r2StorageService.uploadObject(
        thumbnailLargeKey,
        thumbnails.large,
        'image/webp',
      );
      uploadedKeys.push(thumbnailLargeKey);

      // Normalise every video to an H.264/AAC MP4 and swap the stored object —
      // unconditionally, whatever it arrived as. Images were already compressed
      // to WebP synchronously on upload.
      const transcode = isImage
        ? null
        : await this.normalizeVideoToMp4(item, organizationId, userId);

      // Prefer real dimensions from the transcode, else the thumbnail's.
      const width = transcode?.width ?? thumbnails.width;
      const height = transcode?.height ?? thumbnails.height;

      await this.mediaRepository.updateById(organizationId, mediaId, {
        thumbnailSmallKey,
        thumbnailLargeKey,
        ...(transcode
          ? {
              storageKey: transcode.storageKey,
              mimeType: TRANSCODED_VIDEO_MIME_TYPE,
              size: transcode.size,
              ...(transcode.durationSeconds !== undefined
                ? { defaultDuration: transcode.durationSeconds }
                : {}),
            }
          : {}),
        ...(width !== undefined ? { width } : {}),
        ...(height !== undefined ? { height } : {}),
        status: MediaItemStatus.READY,
        processingError: undefined,
      });

      // A freshly processed item (e.g. a transcoded video) may already be placed
      // on a screen/playlist — tell the realtime layer so it enters rotation.
      this.eventEmitter.emit(PlayerEvents.MediaReady, {
        organizationId,
        mediaId,
      } satisfies MediaReadyEvent);
    } catch (error) {
      // Remove any thumbnail uploaded during this failed pass so it can't
      // become an unreferenced orphan in R2.
      if (uploadedKeys.length > 0) {
        await this.r2StorageService
          .deleteObjects(uploadedKeys)
          .catch(() => undefined);
      }

      const attempts = (item.processingAttempts ?? 0) + 1;
      const exhausted = attempts >= MEDIA_PROCESSING_MAX_ATTEMPTS;

      this.logger.error(
        `Failed to process media item ${mediaId} (attempt ${String(attempts)}/${String(
          MEDIA_PROCESSING_MAX_ATTEMPTS,
        )})`,
        error,
      );

      await this.mediaRepository.updateById(organizationId, mediaId, {
        processingAttempts: attempts,
        ...(exhausted
          ? {
              status: MediaItemStatus.FAILED,
              processingError: 'processing_failed',
            }
          : {}),
      });
    }
  }

  private async resolveScopedItems(
    organizationId: string,
    query: MediaListQueryDto,
  ): Promise<MediaItemDocument[]> {
    if (query.all === 'true') {
      return this.mediaRepository.findAllByOrganization(organizationId);
    }

    return this.mediaRepository.findByParent(
      organizationId,
      query.parentId ?? null,
    );
  }

  private assertValidUploadFile(file: Express.Multer.File): void {
    if (!file) {
      throw BusinessException.badRequest(this.i18n.t('media.fileRequired'));
    }

    if (file.size > this.maxFileSizeBytes) {
      throw BusinessException.badRequest(this.i18n.t('media.fileTooLarge'));
    }

    if (
      !ALLOWED_MEDIA_MIME_TYPES.includes(
        file.mimetype as (typeof ALLOWED_MEDIA_MIME_TYPES)[number],
      )
    ) {
      throw BusinessException.badRequest(this.i18n.t('media.invalidFileType'));
    }

    // The declared MIME type is client-controlled — verify the actual bytes
    // match it so a file can't be smuggled in under a falsified content type.
    if (
      !isBufferConsistentWithMime(
        file.buffer,
        file.mimetype as AllowedMediaMimeType,
      )
    ) {
      throw BusinessException.badRequest(
        this.i18n.t('media.invalidFileContent'),
      );
    }
  }

  /**
   * Validates the optional client-captured poster frame for a video upload.
   * A poster is a best-effort enhancement, so anything invalid (wrong type,
   * mismatched bytes, oversized, or attached to a non-video) is ignored and the
   * placeholder path is used instead — it never fails the upload.
   */
  private resolveVideoDuration(
    mediaType: MediaItemType,
    durationSeconds?: number,
  ): number | undefined {
    if (mediaType !== MediaItemType.VIDEO || durationSeconds === undefined) {
      return undefined;
    }

    if (
      !Number.isFinite(durationSeconds) ||
      durationSeconds < 1 ||
      durationSeconds > 3600
    ) {
      throw BusinessException.badRequest(
        this.i18n.t('media.invalidVideoDuration'),
      );
    }

    return Math.round(durationSeconds);
  }

  private resolvePosterSource(
    mediaType: MediaItemType,
    poster?: Express.Multer.File,
  ): { buffer: Buffer; mimeType: string } | undefined {
    if (mediaType !== MediaItemType.VIDEO || !poster?.buffer?.length) {
      return undefined;
    }

    const isAllowedImage = ALLOWED_IMAGE_MIME_TYPES.includes(
      poster.mimetype as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
    );

    if (
      !isAllowedImage ||
      poster.size > this.maxFileSizeBytes ||
      !isBufferConsistentWithMime(
        poster.buffer,
        poster.mimetype as AllowedMediaMimeType,
      )
    ) {
      this.logger.warn('Ignoring invalid video poster frame on upload');
      return undefined;
    }

    return { buffer: poster.buffer, mimeType: poster.mimetype };
  }

  private resolveMediaType(mimeType: string): MediaItemType {
    if (
      ALLOWED_IMAGE_MIME_TYPES.includes(
        mimeType as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
      )
    ) {
      return MediaItemType.IMAGE;
    }

    if (
      ALLOWED_VIDEO_MIME_TYPES.includes(
        mimeType as (typeof ALLOWED_VIDEO_MIME_TYPES)[number],
      )
    ) {
      return MediaItemType.VIDEO;
    }

    throw BusinessException.badRequest(this.i18n.t('media.invalidFileType'));
  }

  /**
   * Decides what actually gets stored.
   *
   * Images are read into memory and re-encoded — Sharp needs the bytes, and an
   * image is bounded by what it can decode anyway. Video is left exactly where
   * it is: if it came in on disk it stays on disk, all the way to R2. That
   * asymmetry is the whole memory saving, so resist "simplifying" it by reading
   * both.
   */
  private async prepareOriginal(
    mediaType: MediaItemType,
    bytes: MediaBytes,
    size: number,
    mimeType: string,
    name: string,
  ): Promise<PreparedOriginal> {
    if (mediaType !== MediaItemType.IMAGE) {
      return { name, mimeType, size, body: bytes };
    }

    const compressed = await this.compressOriginalIfImage(
      mediaType,
      await readMediaBytes(bytes),
      mimeType,
      name,
    );

    return {
      name: compressed.name,
      mimeType: compressed.mimeType,
      size: compressed.buffer.length,
      body: { kind: 'buffer', buffer: compressed.buffer },
    };
  }

  /** Streams a disk-staged original to R2; buffered ones are PUT directly. */
  private async uploadOriginal(
    storageKey: string,
    original: PreparedOriginal,
  ): Promise<void> {
    if (original.body.kind === 'file') {
      await this.r2StorageService.uploadFile(
        storageKey,
        original.body.path,
        original.mimeType,
      );
      return;
    }

    await this.r2StorageService.uploadObject(
      storageKey,
      original.body.buffer,
      original.mimeType,
    );
  }

  /**
   * Re-encodes an original image to WebP before storage to keep R2 usage within
   * the free tier. Non-image media is returned unchanged. If encoding fails we
   * fall back to the original bytes so a single odd file never blocks an upload.
   */
  private async compressOriginalIfImage(
    mediaType: MediaItemType,
    buffer: Buffer,
    mimeType: string,
    name: string,
  ): Promise<{ buffer: Buffer; mimeType: string; name: string }> {
    if (mediaType !== MediaItemType.IMAGE) {
      return { buffer, mimeType, name };
    }

    try {
      const compressed = await this.mediaThumbnailService.compressOriginalImage(
        buffer,
        mimeType,
      );

      return {
        buffer: compressed.buffer,
        mimeType: COMPRESSED_IMAGE_MIME_TYPE,
        name: this.withWebpExtension(name),
      };
    } catch (error) {
      this.logger.warn(
        `Failed to compress original image "${name}"; storing it uncompressed`,
        error,
      );
      return { buffer, mimeType, name };
    }
  }

  /** Swaps a filename's extension for `.webp` (appending if it has none). */
  private withWebpExtension(name: string): string {
    return name.replace(/\.[^./\\]+$/, '') + COMPRESSED_IMAGE_EXTENSION;
  }

  /** Swaps a filename's extension for `.mp4` (appending if it has none). */
  private withMp4Extension(name: string): string {
    return name.replace(/\.[^./\\]+$/, '') + TRANSCODED_VIDEO_EXTENSION;
  }

  /**
   * Re-encodes a stored video to a smaller MP4 and swaps the R2 object for it.
   * The original is downloaded from R2 (it was uploaded synchronously before
   * processing), transcoded, re-uploaded under a new key, and the old object
   * deleted. Returns the new storage metadata, or `null` when transcoding
   * didn't help or failed — in which case the original is left in place. A
   * failure here is non-fatal: the item still becomes READY with its original.
   */
  private async normalizeVideoToMp4(
    item: MediaItemDocument,
    organizationId: string,
    userId: string,
  ): Promise<{
    storageKey: string;
    size: number;
    width?: number;
    height?: number;
    durationSeconds?: number;
  } | null> {
    const sourceKey = item.storageKey;
    if (!sourceKey) {
      return null;
    }

    // Staged on disk end to end: R2 → file → ffmpeg → file → R2. Nothing here
    // ever holds the clip in the heap, which is the whole point — the encoder
    // beside it needs every megabyte it can get, and this process has already
    // been OOM-killed once for handing it less.
    const dir = await mkdtemp(join(tmpdir(), 'media-normalize-'));
    const inputPath = join(dir, 'source');
    const outputPath = join(dir, 'normalized.mp4');

    try {
      const { contentType } = await this.r2StorageService.downloadToFile(
        sourceKey,
        inputPath,
      );
      const normalized = await this.mediaVideoService.normalizeToMp4(
        inputPath,
        outputPath,
        contentType ?? item.mimeType,
      );

      const newKey = this.r2StorageService.buildObjectKey(
        organizationId,
        userId,
        this.withMp4Extension(item.name),
      );

      const { size } = await this.r2StorageService.uploadFile(
        newKey,
        outputPath,
        TRANSCODED_VIDEO_MIME_TYPE,
      );

      // Drop the larger original now that the slimmer copy is durably stored.
      await this.r2StorageService.deleteObject(sourceKey).catch((error) => {
        this.logger.warn(
          `Transcoded video stored but failed to delete original ${sourceKey}`,
          error,
        );
      });

      return {
        storageKey: newKey,
        size,
        width: normalized.width,
        height: normalized.height,
        durationSeconds: normalized.durationSeconds,
      };
    } catch (error) {
      // No fallback to the original — that IS the bug this replaces. Keeping the
      // source whenever the encoder was unhappy is how an unplayable file reached
      // a customer's wall as a black rectangle, with a `status: READY` in the CMS
      // insisting everything was fine. Failing here marks the item FAILED after
      // its retries, which is a state an operator can see and act on.
      this.logger.error(
        `Failed to normalise video ${item._id.toString()} to MP4`,
        error,
      );
      throw error;
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async assertFolderExists(
    organizationId: string,
    folderId: string,
  ): Promise<void> {
    const folder = await this.mediaRepository.findById(
      organizationId,
      folderId,
    );

    if (!folder || folder.type !== MediaItemType.FOLDER) {
      throw BusinessException.notFound(this.i18n.t('media.folderNotFound'));
    }
  }

  private sortByName(items: MediaItemDocument[]): MediaItemDocument[] {
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
  }

  private applyListFilters(
    items: MediaItemDocument[],
    query: MediaListQueryDto,
  ): MediaItemDocument[] {
    if (query.foldersOnly === 'true') {
      return items.filter((item) => item.type === MediaItemType.FOLDER);
    }

    return items;
  }
}
