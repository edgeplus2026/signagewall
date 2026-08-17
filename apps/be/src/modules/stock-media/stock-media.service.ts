import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';

import { BusinessException } from '../../common/exceptions/business.exception';
import { MediaItemResponseDto } from '../media/mappers/media.mapper';
import { MediaService } from '../media/media.service';
import { MediaItemSource } from '../media/schemas/media-item.schema';
import { ContentModerationService } from './content-moderation.service';
import { ImportStockMediaDto } from './dto/import-stock-media.dto';
import { StockMediaCuratedQueryDto } from './dto/stock-media-curated.query';
import { StockMediaSearchQueryDto } from './dto/stock-media-search.query';
import { STOCK_MEDIA_PROVIDER } from './providers/stock-media-provider.interface';
import type { StockMediaProvider } from './providers/stock-media-provider.interface';
import {
  StockMediaItemDto,
  StockMediaPageDto,
} from './providers/stock-media-provider.types';
import {
  StockMediaItemType,
  StockMediaTypeFilter,
  STOCK_MEDIA_DEFAULT_PER_PAGE,
} from './stock-media.constants';

@Injectable()
export class StockMediaService {
  private readonly logger = new Logger(StockMediaService.name);
  private readonly maxImportBytes: number;

  constructor(
    @Inject(STOCK_MEDIA_PROVIDER)
    private readonly provider: StockMediaProvider,
    private readonly moderation: ContentModerationService,
    private readonly mediaService: MediaService,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
  ) {
    this.maxImportBytes = this.configService.getOrThrow<number>(
      'stockMedia.maxImportBytes',
    );
  }

  async search(query: StockMediaSearchQueryDto): Promise<StockMediaPageDto> {
    // Moderation runs before any upstream call, so blocked terms never reach
    // the provider.
    this.assertQueryAllowed(query.query);

    return this.runProvider(() =>
      this.provider.search({
        query: query.query,
        page: query.page ?? 1,
        perPage: query.perPage ?? STOCK_MEDIA_DEFAULT_PER_PAGE,
        mediaType: query.mediaType ?? StockMediaTypeFilter.ALL,
        ...(query.orientation ? { orientation: query.orientation } : {}),
        ...(query.color ? { color: query.color } : {}),
      }),
    );
  }

  async curated(query: StockMediaCuratedQueryDto): Promise<StockMediaPageDto> {
    return this.runProvider(() =>
      this.provider.curated({
        page: query.page ?? 1,
        perPage: query.perPage ?? STOCK_MEDIA_DEFAULT_PER_PAGE,
        mediaType: query.mediaType ?? StockMediaTypeFilter.ALL,
      }),
    );
  }

  async getItem(
    id: string,
    mediaType: StockMediaItemType,
  ): Promise<StockMediaItemDto> {
    return this.runProvider(() => this.provider.getItem(id, mediaType));
  }

  async import(
    organizationId: string,
    userId: string,
    dto: ImportStockMediaDto,
  ): Promise<MediaItemResponseDto> {
    const asset = await this.runProvider(() =>
      this.provider.fetchAsset(dto.id, dto.mediaType),
    );

    // Persist via the shared media pipeline so the import is indistinguishable
    // from a device upload. Its BusinessExceptions (e.g. file too large)
    // propagate as-is — kept outside runProvider so they aren't masked as an
    // upstream provider error.
    return this.mediaService.createMediaFromBuffer(organizationId, userId, {
      buffer: asset.buffer,
      mimeType: asset.mimeType,
      name: asset.name,
      source: MediaItemSource.PEXELS,
      parentId: dto.parentId ?? null,
      maxSizeBytes: this.maxImportBytes,
      // Deliberately NOT awaiting processing. A stock video is transcoded on
      // import, and holding the HTTP request open for that measured 48 SECONDS
      // on one clip — long past any sane proxy or load-balancer timeout, with
      // the browser's connection pinned the whole time. The item is returned
      // immediately in PROCESSING and flips to READY over the realtime channel,
      // exactly as a device upload already does.
      ...(asset.durationSeconds !== undefined
        ? { durationSeconds: asset.durationSeconds }
        : {}),
      ...(asset.thumbnailSource
        ? { thumbnailSource: asset.thumbnailSource }
        : {}),
    });
  }

  private assertQueryAllowed(query: string): void {
    if (this.moderation.isBlocked(query)) {
      throw BusinessException.badRequest(
        this.i18n.t('media.stock.blockedQuery'),
      );
    }
  }

  private async runProvider<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.provider.isConfigured()) {
      throw BusinessException.badRequest(
        this.i18n.t('media.stock.notConfigured'),
      );
    }

    try {
      return await operation();
    } catch (error) {
      this.logger.error('Stock media provider request failed', error);
      throw BusinessException.badRequest(
        this.i18n.t('media.stock.providerError'),
      );
    }
  }
}
