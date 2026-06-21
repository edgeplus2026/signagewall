import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { Types } from 'mongoose';

import { BusinessException } from '../../common/exceptions/business.exception';
import { TransactionService } from '../../common/services/transaction.service';
import { MediaRepository } from '../media/media.repository';
import {
  getMediaThumbnailUrl,
  getPublicBaseUrl,
} from '../media/mappers/media.mapper';
import {
  MediaItemDocument,
  MediaItemStatus,
  MediaItemType,
} from '../media/schemas/media-item.schema';
import { AddPlaylistMediaDto } from './dto/add-playlist-media.dto';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { DuplicatePlaylistDto } from './dto/duplicate-playlist.dto';
import { ReplacePlaylistItemsDto } from './dto/replace-playlist-items.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import {
  PlaylistDetailResponseDto,
  PlaylistDetailWithItemsResponseDto,
  PlaylistItemResponseDto,
  PlaylistSummaryResponseDto,
  toPlaylistDetailResponse,
  toPlaylistDetailWithItemsResponse,
  toPlaylistItemsResponse,
  toPlaylistSummaryResponse,
} from './mappers/playlist.mapper';
import { PlaylistsRepository } from './playlists.repository';
import { PlaylistDocument, PlaylistItemValue } from './schemas/playlist.schema';
import { ScreensService } from '../screens/screens.service';

const MAX_PLAYLIST_ITEMS = 500;
const DEFAULT_ITEM_DURATION = 15;
const MIN_ITEM_DURATION = 1;
const MAX_ITEM_DURATION = 3600;

@Injectable()
export class PlaylistsService {
  constructor(
    private readonly playlistsRepository: PlaylistsRepository,
    private readonly mediaRepository: MediaRepository,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
    private readonly transactionService: TransactionService,
    @Inject(forwardRef(() => ScreensService))
    private readonly screensService: ScreensService,
  ) {}

  async list(organizationId: string): Promise<PlaylistSummaryResponseDto[]> {
    const playlists =
      await this.playlistsRepository.findAllSummariesByOrganization(
        organizationId,
      );
    const thumbnailByMediaId = await this.loadThumbnailUrlMap(
      organizationId,
      playlists,
    );

    return playlists.map((playlist) =>
      toPlaylistSummaryResponse(
        playlist,
        this.resolveThumbnailFromMap(playlist, thumbnailByMediaId),
      ),
    );
  }

  async getById(
    organizationId: string,
    id: string,
  ): Promise<PlaylistDetailResponseDto> {
    const playlist = await this.findSummaryOrThrow(organizationId, id);
    const thumbnailUrl = await this.resolveThumbnailUrl(
      organizationId,
      playlist.coverMediaId,
    );

    return toPlaylistDetailResponse(playlist, thumbnailUrl);
  }

  async getItems(
    organizationId: string,
    id: string,
  ): Promise<PlaylistItemResponseDto[]> {
    const playlist = await this.findPlaylistOrThrow(organizationId, id);
    return toPlaylistItemsResponse(playlist);
  }

  async getScreensUsing(organizationId: string, id: string) {
    // Validate the playlist exists (and is org-scoped) before reporting usage,
    // so a stale/foreign id surfaces a 404 rather than an empty list.
    await this.findSummaryOrThrow(organizationId, id);
    return this.screensService.listUsingPlaylist(organizationId, id);
  }

  async create(
    organizationId: string,
    dto: CreatePlaylistDto,
  ): Promise<PlaylistDetailResponseDto> {
    const playlist = await this.playlistsRepository.create({
      organizationId,
      name: dto.name,
      ...(dto.description ? { description: dto.description } : {}),
    });

    return toPlaylistDetailResponse(playlist);
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdatePlaylistDto,
  ): Promise<PlaylistDetailResponseDto> {
    if (dto.name === undefined && dto.description === undefined) {
      throw BusinessException.badRequest(this.i18n.t('playlists.emptyUpdate'));
    }

    const updated = await this.playlistsRepository.updateById(
      organizationId,
      id,
      {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
      },
    );

    if (!updated) {
      throw BusinessException.notFound(this.i18n.t('playlists.notFound'));
    }

    const thumbnailUrl = await this.resolveThumbnailUrl(
      organizationId,
      updated.coverMediaId,
    );

    return toPlaylistDetailResponse(updated, thumbnailUrl);
  }

  async deleteMany(organizationId: string, ids: string[]): Promise<void> {
    const uniqueIds = [...new Set(ids)];

    // Validate before deleting so a bad/stale id can never cause a partial,
    // non-atomic delete that also reports failure.
    const existingIds = await this.playlistsRepository.findExistingIds(
      organizationId,
      uniqueIds,
    );

    if (existingIds.length !== uniqueIds.length) {
      throw BusinessException.notFound(this.i18n.t('playlists.notFound'));
    }

    await this.transactionService.run(async (session) => {
      await this.screensService.purgePlaylistReferences(
        organizationId,
        uniqueIds,
        session,
      );
      await this.playlistsRepository.deleteMany(
        organizationId,
        uniqueIds,
        session,
      );
    });
  }

  async addMedia(
    organizationId: string,
    dto: AddPlaylistMediaDto,
  ): Promise<void> {
    const playlistIds = [...new Set(dto.playlistIds)];
    const mediaIds = [...new Set(dto.mediaIds)];

    const mediaItems = await this.validateMediaItems(organizationId, mediaIds);
    const durationByMediaId = new Map(
      mediaItems.map((item) => [
        item._id.toString(),
        this.resolveItemDuration(item),
      ]),
    );

    const playlists = await this.playlistsRepository.findSummariesByIds(
      organizationId,
      playlistIds,
    );

    if (playlists.length !== playlistIds.length) {
      throw BusinessException.notFound(this.i18n.t('playlists.notFound'));
    }

    for (const playlist of playlists) {
      if (playlist.itemCount + mediaIds.length > MAX_PLAYLIST_ITEMS) {
        throw BusinessException.badRequest(
          this.i18n.t('playlists.maxItemsExceeded'),
        );
      }
    }

    await Promise.all(
      playlists.map((playlist) => {
        const baseOrder = playlist.itemCount;
        const items = mediaIds.map((mediaId, index) => ({
          _id: new Types.ObjectId(),
          mediaId: new Types.ObjectId(mediaId),
          order: baseOrder + index,
          duration: durationByMediaId.get(mediaId) ?? DEFAULT_ITEM_DURATION,
          disabled: false,
        }));
        const addedDuration = items.reduce(
          (total, item) => total + item.duration,
          0,
        );
        const setCover =
          playlist.itemCount === 0 ? items[0]?.mediaId : undefined;

        return this.playlistsRepository.appendItems(
          organizationId,
          playlist._id.toString(),
          items,
          addedDuration,
          setCover,
        );
      }),
    );
  }

  async duplicate(
    organizationId: string,
    id: string,
    dto: DuplicatePlaylistDto,
  ): Promise<PlaylistDetailResponseDto> {
    const source = await this.findPlaylistOrThrow(organizationId, id);
    const suffix = dto.copySuffix ?? ' (copy)';
    const sortedItems = [...source.items].sort((a, b) => a.order - b.order);

    // No media re-validation here: we are copying data the playlist already
    // holds. Blocking a duplicate because a media item has since changed state
    // would be surprising and inconsistent with the source remaining usable.
    const derived = this.buildDerivedItemFields(
      sortedItems.map((item) => ({
        mediaId: item.mediaId,
        duration: item.duration,
        disabled: item.disabled,
      })),
    );

    const duplicate = await this.playlistsRepository.createWithItems(
      {
        organizationId,
        name: `${source.name}${suffix}`,
        ...(source.description ? { description: source.description } : {}),
      },
      derived,
    );

    const thumbnailUrl = await this.resolveThumbnailUrl(
      organizationId,
      duplicate.coverMediaId,
    );

    return toPlaylistDetailResponse(duplicate, thumbnailUrl);
  }

  async replaceItems(
    organizationId: string,
    id: string,
    dto: ReplacePlaylistItemsDto,
  ): Promise<PlaylistDetailWithItemsResponseDto> {
    const playlist = await this.findPlaylistOrThrow(organizationId, id);

    if (
      dto.expectedUpdatedAt !== undefined &&
      playlist.updatedAt.toISOString() !== dto.expectedUpdatedAt
    ) {
      throw BusinessException.conflict(this.i18n.t('playlists.conflict'));
    }

    this.assertUniqueClientItemIds(dto);

    await this.validateMediaItems(
      organizationId,
      dto.items.map((item) => item.mediaId),
    );

    const existingIds = new Set(
      playlist.items.map((item) => item._id.toString()),
    );

    for (const item of dto.items) {
      if (item.id && !existingIds.has(item.id)) {
        throw BusinessException.notFound(this.i18n.t('playlists.itemNotFound'));
      }
    }

    const derived = this.buildDerivedItemFields(
      dto.items.map((item) => ({
        ...(item.id ? { _id: new Types.ObjectId(item.id) } : {}),
        mediaId: new Types.ObjectId(item.mediaId),
        duration: item.duration,
        disabled: item.disabled ?? false,
      })),
    );

    // Atomic, concurrency-guarded write: the loaded `updatedAt` doubles as the
    // optimistic-lock token, so a write that slipped in since we read is
    // rejected (mapped to 409) instead of being silently overwritten.
    const saved = await this.playlistsRepository.replaceItems(
      organizationId,
      id,
      playlist.updatedAt,
      derived,
    );

    if (!saved) {
      throw BusinessException.conflict(this.i18n.t('playlists.conflict'));
    }

    const thumbnailUrl = await this.resolveThumbnailUrl(
      organizationId,
      saved.coverMediaId,
    );

    return toPlaylistDetailWithItemsResponse(saved, thumbnailUrl);
  }

  private assertUniqueClientItemIds(dto: ReplacePlaylistItemsDto): void {
    const providedIds = dto.items
      .map((item) => item.id)
      .filter((itemId): itemId is string => Boolean(itemId));

    if (new Set(providedIds).size !== providedIds.length) {
      throw BusinessException.badRequest(
        this.i18n.t('playlists.duplicateItemIds'),
      );
    }
  }

  private buildDerivedItemFields(
    items: Array<{
      _id?: Types.ObjectId;
      mediaId: Types.ObjectId;
      duration: number;
      disabled?: boolean;
    }>,
  ): {
    items: PlaylistItemValue[];
    itemCount: number;
    totalDuration: number;
    coverMediaId?: Types.ObjectId;
  } {
    const normalized: PlaylistItemValue[] = items.map((item, index) => ({
      _id: item._id ?? new Types.ObjectId(),
      mediaId: item.mediaId,
      order: index,
      duration: item.duration,
      disabled: item.disabled ?? false,
    }));

    return {
      items: normalized,
      itemCount: normalized.length,
      totalDuration: normalized.reduce(
        (total, item) => total + (item.disabled ? 0 : item.duration),
        0,
      ),
      coverMediaId: normalized[0]?.mediaId,
    };
  }

  private async findPlaylistOrThrow(
    organizationId: string,
    id: string,
  ): Promise<PlaylistDocument> {
    const playlist = await this.playlistsRepository.findById(
      organizationId,
      id,
    );

    if (!playlist) {
      throw BusinessException.notFound(this.i18n.t('playlists.notFound'));
    }

    return playlist;
  }

  private async findSummaryOrThrow(
    organizationId: string,
    id: string,
  ): Promise<PlaylistDocument> {
    const playlist = await this.playlistsRepository.findSummaryById(
      organizationId,
      id,
    );

    if (!playlist) {
      throw BusinessException.notFound(this.i18n.t('playlists.notFound'));
    }

    return playlist;
  }

  private async validateMediaItems(
    organizationId: string,
    mediaIds: string[],
  ): Promise<MediaItemDocument[]> {
    if (mediaIds.length === 0) {
      return [];
    }

    const uniqueIds = [...new Set(mediaIds)];
    const mediaItems = await this.mediaRepository.findByIds(
      organizationId,
      uniqueIds,
    );

    if (mediaItems.length !== uniqueIds.length) {
      throw BusinessException.notFound(this.i18n.t('playlists.mediaNotFound'));
    }

    const hasInvalidType = mediaItems.some(
      (item) =>
        item.type !== MediaItemType.IMAGE && item.type !== MediaItemType.VIDEO,
    );

    if (hasInvalidType) {
      throw BusinessException.badRequest(
        this.i18n.t('playlists.invalidMediaType'),
      );
    }

    const hasUnavailableMedia = mediaItems.some(
      (item) => item.status !== MediaItemStatus.READY,
    );

    if (hasUnavailableMedia) {
      throw BusinessException.badRequest(
        this.i18n.t('playlists.mediaNotReady'),
      );
    }

    return mediaItems;
  }

  private resolveItemDuration(media: MediaItemDocument): number {
    const duration = media.defaultDuration ?? DEFAULT_ITEM_DURATION;
    return Math.min(MAX_ITEM_DURATION, Math.max(MIN_ITEM_DURATION, duration));
  }

  private async loadThumbnailUrlMap(
    organizationId: string,
    playlists: PlaylistDocument[],
  ): Promise<Map<string, string>> {
    const mediaIds = [
      ...new Set(
        playlists
          .map((playlist) => playlist.coverMediaId?.toString())
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    if (mediaIds.length === 0) {
      return new Map();
    }

    const mediaItems = await this.mediaRepository.findByIds(
      organizationId,
      mediaIds,
    );
    const publicBaseUrl = getPublicBaseUrl(this.configService);

    return new Map(
      mediaItems.flatMap((item) => {
        const thumbnailUrl = getMediaThumbnailUrl(item, publicBaseUrl);
        return thumbnailUrl
          ? [[item._id.toString(), thumbnailUrl] as const]
          : [];
      }),
    );
  }

  private resolveThumbnailFromMap(
    playlist: PlaylistDocument,
    thumbnailByMediaId: Map<string, string>,
  ): string | undefined {
    const coverMediaId = playlist.coverMediaId?.toString();
    return coverMediaId ? thumbnailByMediaId.get(coverMediaId) : undefined;
  }

  private async resolveThumbnailUrl(
    organizationId: string,
    coverMediaId?: Types.ObjectId,
  ): Promise<string | undefined> {
    if (!coverMediaId) {
      return undefined;
    }

    const media = await this.mediaRepository.findById(
      organizationId,
      coverMediaId.toString(),
    );

    if (!media) {
      return undefined;
    }

    return getMediaThumbnailUrl(media, getPublicBaseUrl(this.configService));
  }
}
