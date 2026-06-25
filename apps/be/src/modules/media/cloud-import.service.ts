import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  CLOUD_IMPORT_CONCURRENCY,
  CloudImportError,
  mapWithConcurrency,
  PROVIDER_TO_SOURCE,
} from './cloud-import.constants';
import { CloudMediaFetcher } from './cloud-media.fetcher';
import {
  CloudImportResponseDto,
  CloudImportResultItemDto,
} from './dto/cloud-import-result.dto';
import {
  CloudImportItemDto,
  ImportCloudMediaDto,
} from './dto/import-cloud-media.dto';
import {
  ALLOWED_MEDIA_MIME_TYPES,
  AllowedMediaMimeType,
} from './media.constants';
import { MediaService } from './media.service';

@Injectable()
export class CloudImportService {
  private readonly logger = new Logger(CloudImportService.name);
  private readonly maxImportBytes: number;

  constructor(
    private readonly mediaService: MediaService,
    private readonly fetcher: CloudMediaFetcher,
    private readonly configService: ConfigService,
  ) {
    // Reuse the stock-media import ceiling: provider videos commonly exceed the
    // 10 MB user-upload limit, exactly the case the shared pipeline allows for.
    this.maxImportBytes = this.configService.getOrThrow<number>(
      'stockMedia.maxImportBytes',
    );
  }

  /**
   * Imports a batch of cloud-picked items: each is fetched server-side and
   * persisted through the shared media pipeline (so they're indistinguishable
   * from device uploads). One item failing never aborts the batch — the caller
   * gets a per-item result and can report exactly what succeeded.
   */
  async import(
    organizationId: string,
    userId: string,
    dto: ImportCloudMediaDto,
  ): Promise<CloudImportResponseDto> {
    const parentId = dto.parentId ?? null;

    const results = await mapWithConcurrency(
      dto.items,
      CLOUD_IMPORT_CONCURRENCY,
      (item) => this.importOne(organizationId, userId, parentId, item),
    );

    const importedCount = results.filter((r) => r.status === 'imported').length;
    return {
      results,
      importedCount,
      failedCount: results.length - importedCount,
    };
  }

  private async importOne(
    organizationId: string,
    userId: string,
    parentId: string | null,
    item: CloudImportItemDto,
  ): Promise<CloudImportResultItemDto> {
    try {
      // Fast reject before any network call.
      if (
        !ALLOWED_MEDIA_MIME_TYPES.includes(
          item.mimeType as AllowedMediaMimeType,
        )
      ) {
        return {
          externalId: item.externalId,
          status: 'failed',
          error: 'invalid_file_type',
        };
      }

      const asset = await this.fetcher.fetch(item, this.maxImportBytes);
      const mimeType = this.pickAllowedMime(asset.contentType, item.mimeType);

      // createMediaFromBuffer re-validates size, MIME and magic bytes, stores
      // the original, and kicks off thumbnail/transcode processing.
      const media = await this.mediaService.createMediaFromBuffer(
        organizationId,
        userId,
        {
          buffer: asset.buffer,
          mimeType,
          name: item.name,
          source: PROVIDER_TO_SOURCE[item.provider],
          parentId,
          maxSizeBytes: this.maxImportBytes,
          awaitProcessing: true,
        },
      );

      return {
        externalId: item.externalId,
        status: 'imported',
        mediaId: media.id,
        media,
      };
    } catch (error) {
      const code = this.toErrorCode(error);
      this.logger.warn(
        `Cloud import failed for "${item.name}" (${item.provider}): ${code}`,
      );
      return { externalId: item.externalId, status: 'failed', error: code };
    }
  }

  /** Prefer the server-observed content type when it is itself allowed. */
  private pickAllowedMime(
    contentType: string | undefined,
    declared: string,
  ): string {
    const normalized = contentType?.split(';')[0]?.trim().toLowerCase();
    if (
      normalized &&
      ALLOWED_MEDIA_MIME_TYPES.includes(normalized as AllowedMediaMimeType)
    ) {
      return normalized;
    }
    return declared;
  }

  private toErrorCode(error: unknown): string {
    if (error instanceof CloudImportError) {
      return error.code;
    }
    return 'import_failed';
  }
}
