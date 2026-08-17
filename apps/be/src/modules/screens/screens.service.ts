import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { I18nService } from 'nestjs-i18n';
import { ClientSession, Types } from 'mongoose';

import { BusinessException } from '../../common/exceptions/business.exception';
import { AnalyticsService } from '../analytics/analytics.service';
import { FunnelEventName } from '../analytics/schemas/funnel-event.schema';
import {
  PlayerEvents,
  ScreenContentChangedEvent,
  ScreensDeletedEvent,
} from '../player/player.events';
import { AppInstancesRepository } from '../apps/app-instances.repository';
import { MediaRepository } from '../media/media.repository';
import { PlansService } from '../plans/plans.service';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import {
  getMediaThumbnailUrl,
  getPublicBaseUrl,
} from '../media/mappers/media.mapper';
import {
  MediaItemDocument,
  MediaItemStatus,
  MediaItemType,
} from '../media/schemas/media-item.schema';
import { PlaylistsRepository } from '../playlists/playlists.repository';
import { AvailabilityEvaluator } from './availability/availability.evaluator';
import { validateAvailability } from './availability/availability.validation';
import { AddScreenAppsDto } from './dto/add-screen-apps.dto';
import { AddScreenMediaDto } from './dto/add-screen-media.dto';
import { AddScreenPlaylistsDto } from './dto/add-screen-playlists.dto';
import { CreateScreenDto } from './dto/create-screen.dto';
import {
  ReplaceScreenItemDto,
  ReplaceScreenItemsDto,
} from './dto/replace-screen-items.dto';
import { UpdateScreenAvailabilityDto } from './dto/update-screen-availability.dto';
import { UpdateScreenDto } from './dto/update-screen.dto';
import {
  ScreenAvailabilityResponseDto,
  ScreenDetailResponseDto,
  ScreenDetailWithItemsResponseDto,
  ScreenItemResponseDto,
  ScreenStatusResponseDto,
  ScreenSummaryResponseDto,
  toScreenAvailabilityResponse,
  toScreenDetailResponse,
  toScreenDetailWithItemsResponse,
  toScreenItemsResponse,
  toScreenStatusResponse,
  toScreenSummaryResponse,
} from './mappers/screen.mapper';
import { ScreensRepository } from './screens.repository';
import {
  ScreenAvailability,
  ScreenAvailabilityMode,
  ScreenDocument,
  ScreenItemDocument,
  ScreenItemType,
  ScreenItemValue,
} from './schemas/screen.schema';

const MAX_SCREEN_ITEMS = 500;
const DEFAULT_ITEM_DURATION = 15;
const MIN_ITEM_DURATION = 1;
const MAX_ITEM_DURATION = 3600;

/** Used for status of screens that have no availability configured (always-on). */
const DEFAULT_TIMEZONE = 'UTC';

@Injectable()
export class ScreensService {
  constructor(
    private readonly screensRepository: ScreensRepository,
    private readonly mediaRepository: MediaRepository,
    private readonly playlistsRepository: PlaylistsRepository,
    private readonly appInstancesRepository: AppInstancesRepository,
    private readonly plansService: PlansService,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
    private readonly availabilityEvaluator: AvailabilityEvaluator,
    private readonly eventEmitter: EventEmitter2,
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly analytics: AnalyticsService,
  ) {}

  /** Notifies the realtime player layer that a screen's content changed. */
  private emitContentChanged(organizationId: string, screenId: string): void {
    this.eventEmitter.emit(PlayerEvents.ScreenContentChanged, {
      organizationId,
      screenId,
    } satisfies ScreenContentChangedEvent);
  }

  async list(organizationId: string): Promise<ScreenSummaryResponseDto[]> {
    const screens =
      await this.screensRepository.findAllSummariesByOrganization(
        organizationId,
      );
    const thumbnailByMediaId = await this.loadThumbnailUrlMap(
      organizationId,
      screens,
    );

    return screens.map((screen) =>
      toScreenSummaryResponse(
        screen,
        this.resolveThumbnailFromMap(screen, thumbnailByMediaId),
      ),
    );
  }

  async getById(
    organizationId: string,
    id: string,
  ): Promise<ScreenDetailResponseDto> {
    const screen = await this.findSummaryOrThrow(organizationId, id);
    const thumbnailUrl = await this.resolveThumbnailUrl(
      organizationId,
      screen.coverMediaId,
    );

    return toScreenDetailResponse(screen, thumbnailUrl);
  }

  /** Screens that currently reference the given playlist in their items. */
  async listUsingPlaylist(
    organizationId: string,
    playlistId: string,
  ): Promise<ScreenSummaryResponseDto[]> {
    const screens = await this.screensRepository.findContainingPlaylistIds(
      organizationId,
      [playlistId],
    );
    const thumbnailByMediaId = await this.loadThumbnailUrlMap(
      organizationId,
      screens,
    );

    return screens
      .map((screen) =>
        toScreenSummaryResponse(
          screen,
          this.resolveThumbnailFromMap(screen, thumbnailByMediaId),
        ),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getItems(
    organizationId: string,
    id: string,
  ): Promise<ScreenItemResponseDto[]> {
    const screen = await this.findScreenOrThrow(organizationId, id);
    return toScreenItemsResponse(screen);
  }

  async create(
    organizationId: string,
    dto: CreateScreenDto,
  ): Promise<ScreenDetailResponseDto> {
    // The only place screens come into existence, so the only place the licence
    // cap has to be enforced. Throws 403 with PLAN_LIMIT_REACHED details, which
    // the CMS turns into the upgrade modal.
    await this.plansService.assertCanCreateScreen(organizationId);

    const screen = await this.screensRepository.create({
      organizationId,
      name: dto.name,
      ...(dto.description ? { description: dto.description } : {}),
    });

    // Closes the pre-check's race window: concurrent creates that all passed
    // assertCanCreateScreen roll back their own over-cap insert here.
    await this.plansService.assertCreatedScreenWithinLimit(
      organizationId,
      screen._id.toString(),
    );

    await this.recordForOrganization(organizationId, {
      eventName: FunnelEventName.SCREEN_CREATED,
      organizationId,
      dedupeKey: `screen_created:screen:${screen._id.toString()}`,
      properties: { screenQuantity: 1 },
    });

    return toScreenDetailResponse(screen);
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateScreenDto,
  ): Promise<ScreenDetailResponseDto> {
    if (dto.name === undefined && dto.description === undefined) {
      throw BusinessException.badRequest(this.i18n.t('screens.emptyUpdate'));
    }

    const updated = await this.screensRepository.updateById(
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
      throw BusinessException.notFound(this.i18n.t('screens.notFound'));
    }

    const thumbnailUrl = await this.resolveThumbnailUrl(
      organizationId,
      updated.coverMediaId,
    );

    return toScreenDetailResponse(updated, thumbnailUrl);
  }

  async updateAvailability(
    organizationId: string,
    id: string,
    dto: UpdateScreenAvailabilityDto,
  ): Promise<ScreenAvailabilityResponseDto> {
    const availability: ScreenAvailability = {
      mode: dto.mode,
      timezone: dto.timezone,
      weekly: dto.weekly.map((entry) => ({
        day: entry.day,
        enabled: entry.enabled,
        start: entry.start,
        end: entry.end,
      })),
      special: {
        startDate: dto.special.startDate,
        endDate: dto.special.endDate,
        start: dto.special.start,
        end: dto.special.end,
      },
    };

    const validationError = validateAvailability(availability);
    if (validationError) {
      throw BusinessException.badRequest(
        this.i18n.t(`screens.availability.${validationError}`),
      );
    }

    const updated = await this.screensRepository.updateById(
      organizationId,
      id,
      { availability },
      // Availability is config, not content: bumping `updatedAt` here would
      // invalidate the content editor's optimistic lock (which is keyed on
      // `updatedAt`) and 409 the operator's next content save. The player still
      // gets the change — the snapshot revision folds in the availability rule
      // independently of `updatedAt`.
      { touch: false },
    );

    if (!updated) {
      throw BusinessException.notFound(this.i18n.t('screens.notFound'));
    }

    // The rule rides in the player snapshot, so an edit must re-push it to the
    // device just like a content change.
    this.emitContentChanged(organizationId, id);

    return toScreenAvailabilityResponse(availability);
  }

  async getAvailability(
    organizationId: string,
    id: string,
  ): Promise<ScreenAvailabilityResponseDto | null> {
    const screen = await this.findSummaryOrThrow(organizationId, id);
    return screen.availability
      ? toScreenAvailabilityResponse(screen.availability)
      : null;
  }

  async getStatus(
    organizationId: string,
    id: string,
  ): Promise<ScreenStatusResponseDto> {
    const screen = await this.findSummaryOrThrow(organizationId, id);
    const { availability } = screen;
    const now = new Date();

    return toScreenStatusResponse(
      this.availabilityEvaluator.isOnAt(availability, now),
      availability?.mode ?? ScreenAvailabilityMode.ALWAYS,
      availability?.timezone ?? DEFAULT_TIMEZONE,
      this.availabilityEvaluator.currentWindow(availability, now),
      this.availabilityEvaluator.nextTransition(availability, now),
    );
  }

  async deleteMany(organizationId: string, ids: string[]): Promise<void> {
    const uniqueIds = [...new Set(ids)];

    const existingIds = await this.screensRepository.findExistingIds(
      organizationId,
      uniqueIds,
    );

    if (existingIds.length !== uniqueIds.length) {
      throw BusinessException.notFound(this.i18n.t('screens.notFound'));
    }

    await this.screensRepository.deleteMany(organizationId, uniqueIds);

    this.eventEmitter.emit(PlayerEvents.ScreensDeleted, {
      organizationId,
      screenIds: uniqueIds,
    } satisfies ScreensDeletedEvent);
  }

  async addMedia(
    organizationId: string,
    dto: AddScreenMediaDto,
  ): Promise<void> {
    const screenIds = [...new Set(dto.screenIds)];
    const mediaIds = [...new Set(dto.mediaIds)];

    const mediaItems = await this.validateMediaItems(organizationId, mediaIds);
    const durationByMediaId = new Map(
      mediaItems.map((item) => [
        item._id.toString(),
        this.resolveItemDuration(item),
      ]),
    );

    const screens = await this.screensRepository.findSummariesByIds(
      organizationId,
      screenIds,
    );

    if (screens.length !== screenIds.length) {
      throw BusinessException.notFound(this.i18n.t('screens.notFound'));
    }

    for (const screen of screens) {
      if (screen.itemCount + mediaIds.length > MAX_SCREEN_ITEMS) {
        throw BusinessException.badRequest(
          this.i18n.t('screens.maxItemsExceeded'),
        );
      }
    }

    await Promise.all(
      screens.map(async (screen) => {
        const baseOrder = screen.itemCount;
        const items: ScreenItemValue[] = mediaIds.map((mediaId, index) => ({
          _id: new Types.ObjectId(),
          type: ScreenItemType.MEDIA,
          mediaId: new Types.ObjectId(mediaId),
          order: baseOrder + index,
          duration: durationByMediaId.get(mediaId) ?? DEFAULT_ITEM_DURATION,
          disabled: false,
        }));
        const addedDuration = items.reduce(
          (total, item) => total + (item.duration ?? 0),
          0,
        );
        const setCover =
          screen.itemCount === 0
            ? await this.resolveCoverMediaId(organizationId, items)
            : undefined;

        return this.screensRepository.appendItems(
          organizationId,
          screen._id.toString(),
          items,
          addedDuration,
          setCover,
        );
      }),
    );

    for (const screen of screens) {
      this.emitContentChanged(organizationId, screen._id.toString());
      await this.recordContentPublished(organizationId, screen._id.toString());
    }
  }

  async addPlaylists(
    organizationId: string,
    dto: AddScreenPlaylistsDto,
  ): Promise<void> {
    const screenIds = [...new Set(dto.screenIds)];
    const playlistIds = [...new Set(dto.playlistIds)];

    await this.validatePlaylistItems(organizationId, playlistIds);

    const screens = await this.screensRepository.findSummariesByIds(
      organizationId,
      screenIds,
    );

    if (screens.length !== screenIds.length) {
      throw BusinessException.notFound(this.i18n.t('screens.notFound'));
    }

    for (const screen of screens) {
      if (screen.itemCount + playlistIds.length > MAX_SCREEN_ITEMS) {
        throw BusinessException.badRequest(
          this.i18n.t('screens.maxItemsExceeded'),
        );
      }
    }

    await Promise.all(
      screens.map(async (screen) => {
        const baseOrder = screen.itemCount;
        const items: ScreenItemValue[] = playlistIds.map(
          (playlistId, index) => ({
            _id: new Types.ObjectId(),
            type: ScreenItemType.PLAYLIST,
            playlistId: new Types.ObjectId(playlistId),
            order: baseOrder + index,
            disabled: false,
          }),
        );
        const setCover =
          screen.itemCount === 0
            ? await this.resolveCoverMediaId(organizationId, items)
            : undefined;

        return this.screensRepository.appendItems(
          organizationId,
          screen._id.toString(),
          items,
          0,
          setCover,
        );
      }),
    );

    for (const screen of screens) {
      this.emitContentChanged(organizationId, screen._id.toString());
      await this.recordContentPublished(organizationId, screen._id.toString());
    }
  }

  async addApps(organizationId: string, dto: AddScreenAppsDto): Promise<void> {
    const screenIds = [...new Set(dto.screenIds)];
    const appInstanceIds = [...new Set(dto.appInstanceIds)];

    await this.validateAppItems(organizationId, appInstanceIds);

    const screens = await this.screensRepository.findSummariesByIds(
      organizationId,
      screenIds,
    );

    if (screens.length !== screenIds.length) {
      throw BusinessException.notFound(this.i18n.t('screens.notFound'));
    }

    for (const screen of screens) {
      if (screen.itemCount + appInstanceIds.length > MAX_SCREEN_ITEMS) {
        throw BusinessException.badRequest(
          this.i18n.t('screens.maxItemsExceeded'),
        );
      }
    }

    await Promise.all(
      screens.map((screen) => {
        const baseOrder = screen.itemCount;
        const items: ScreenItemValue[] = appInstanceIds.map(
          (appInstanceId, index) => ({
            _id: new Types.ObjectId(),
            type: ScreenItemType.APP,
            appInstanceId: new Types.ObjectId(appInstanceId),
            order: baseOrder + index,
            duration: DEFAULT_ITEM_DURATION,
            disabled: false,
          }),
        );
        const addedDuration = items.length * DEFAULT_ITEM_DURATION;

        return this.screensRepository.appendItems(
          organizationId,
          screen._id.toString(),
          items,
          addedDuration,
        );
      }),
    );

    for (const screen of screens) {
      this.emitContentChanged(organizationId, screen._id.toString());
      await this.recordContentPublished(organizationId, screen._id.toString());
    }
  }

  /** Ensures every referenced app instance exists in the organization. */
  private async validateAppItems(
    organizationId: string,
    appInstanceIds: string[],
  ): Promise<void> {
    if (appInstanceIds.length === 0) {
      return;
    }

    const instances = await this.appInstancesRepository.findByIds(
      organizationId,
      appInstanceIds,
    );

    if (instances.length !== new Set(appInstanceIds).size) {
      throw BusinessException.notFound(this.i18n.t('screens.appNotFound'));
    }
  }

  async purgeMediaReferences(
    organizationId: string,
    mediaIds: string[],
    session?: ClientSession,
  ): Promise<void> {
    const uniqueIds = [...new Set(mediaIds)];
    if (uniqueIds.length === 0) {
      return;
    }

    const mediaObjectIds = uniqueIds.map((id) => new Types.ObjectId(id));
    const screens = await this.screensRepository.findContainingMediaIds(
      organizationId,
      uniqueIds,
      session,
    );

    for (const screen of screens) {
      const remaining = this.toItemValues(screen.items).filter(
        (item) =>
          !(
            item.type === ScreenItemType.MEDIA &&
            item.mediaId &&
            mediaObjectIds.some((id) => id.equals(item.mediaId))
          ),
      );
      const derived = await this.buildDerivedItemFields(
        organizationId,
        remaining,
        session,
      );
      await this.screensRepository.updateDerivedItemsWithoutLock(
        organizationId,
        screen._id.toString(),
        derived,
        session,
      );
    }
  }

  /**
   * Re-derives the cover of every screen that references one of the given
   * playlists, without removing any items (the playlists still exist). Used when
   * a playlist's own cover changed — e.g. its cover media was deleted — so a
   * screen whose thumbnail mirrors that playlist's cover stops pointing at the
   * now-gone media. `buildDerivedItemFields` re-reads the playlist's current
   * cover, so the screen follows along.
   */
  async refreshPlaylistCovers(
    organizationId: string,
    playlistIds: string[],
    session?: ClientSession,
  ): Promise<void> {
    const uniqueIds = [...new Set(playlistIds)];
    if (uniqueIds.length === 0) {
      return;
    }

    const screens = await this.screensRepository.findContainingPlaylistIds(
      organizationId,
      uniqueIds,
      session,
    );

    for (const screen of screens) {
      const derived = await this.buildDerivedItemFields(
        organizationId,
        this.toItemValues(screen.items),
        session,
      );
      await this.screensRepository.updateDerivedItemsWithoutLock(
        organizationId,
        screen._id.toString(),
        derived,
        session,
      );
    }
  }

  /**
   * Drops references to the given playlists from every screen that contains
   * them. Returns the ids of the screens it modified so the caller can emit
   * content-change events after the surrounding transaction commits (emitting
   * mid-transaction would let the realtime resolver read pre-commit state).
   */
  async purgePlaylistReferences(
    organizationId: string,
    playlistIds: string[],
    session?: ClientSession,
  ): Promise<string[]> {
    const uniqueIds = [...new Set(playlistIds)];
    if (uniqueIds.length === 0) {
      return [];
    }

    const playlistObjectIds = uniqueIds.map((id) => new Types.ObjectId(id));
    const screens = await this.screensRepository.findContainingPlaylistIds(
      organizationId,
      uniqueIds,
      session,
    );

    for (const screen of screens) {
      const remaining = this.toItemValues(screen.items).filter(
        (item) =>
          !(
            item.type === ScreenItemType.PLAYLIST &&
            item.playlistId &&
            playlistObjectIds.some((id) => id.equals(item.playlistId))
          ),
      );
      const derived = await this.buildDerivedItemFields(
        organizationId,
        remaining,
        session,
      );
      await this.screensRepository.updateDerivedItemsWithoutLock(
        organizationId,
        screen._id.toString(),
        derived,
        session,
      );
    }

    return screens.map((screen) => screen._id.toString());
  }

  /**
   * Drops references to the given app instances from every screen that contains
   * them (when an app instance is deleted). Returns the ids of the screens it
   * modified so the caller can emit content-change events after the surrounding
   * transaction commits. Mirrors {@link purgePlaylistReferences}.
   */
  async purgeAppInstanceReferences(
    organizationId: string,
    appInstanceIds: string[],
    session?: ClientSession,
  ): Promise<string[]> {
    const uniqueIds = [...new Set(appInstanceIds)];
    if (uniqueIds.length === 0) {
      return [];
    }

    const appObjectIds = uniqueIds.map((id) => new Types.ObjectId(id));
    const screens = await this.screensRepository.findContainingAppInstanceIds(
      organizationId,
      uniqueIds,
      session,
    );

    for (const screen of screens) {
      const remaining = this.toItemValues(screen.items).filter(
        (item) =>
          !(
            item.type === ScreenItemType.APP &&
            item.appInstanceId &&
            appObjectIds.some((id) => id.equals(item.appInstanceId))
          ),
      );
      const derived = await this.buildDerivedItemFields(
        organizationId,
        remaining,
        session,
      );
      await this.screensRepository.updateDerivedItemsWithoutLock(
        organizationId,
        screen._id.toString(),
        derived,
        session,
      );
    }

    return screens.map((screen) => screen._id.toString());
  }

  async replaceItems(
    organizationId: string,
    id: string,
    dto: ReplaceScreenItemsDto,
  ): Promise<ScreenDetailWithItemsResponseDto> {
    const screen = await this.findScreenOrThrow(organizationId, id);

    if (
      dto.expectedUpdatedAt !== undefined &&
      screen.updatedAt.toISOString() !== dto.expectedUpdatedAt
    ) {
      throw BusinessException.conflict(this.i18n.t('screens.conflict'));
    }

    this.assertValidItems(dto);
    this.assertUniqueClientItemIds(dto);

    await this.validateMediaItems(
      organizationId,
      dto.items
        .filter((item) => item.type === ScreenItemType.MEDIA)
        .map((item) => item.mediaId as string),
    );

    await this.validatePlaylistItems(
      organizationId,
      dto.items
        .filter((item) => item.type === ScreenItemType.PLAYLIST)
        .map((item) => item.playlistId as string),
    );

    await this.validateAppItems(
      organizationId,
      dto.items
        .filter((item) => item.type === ScreenItemType.APP)
        .map((item) => item.appInstanceId as string),
    );

    const existingIds = new Set(
      screen.items.map((item) => item._id.toString()),
    );

    for (const item of dto.items) {
      if (item.id && !existingIds.has(item.id)) {
        throw BusinessException.notFound(this.i18n.t('screens.itemNotFound'));
      }
    }

    const items: ScreenItemValue[] = dto.items.map((item, index) => ({
      _id: item.id ? new Types.ObjectId(item.id) : new Types.ObjectId(),
      type: item.type,
      ...this.buildItemRef(item),
      order: index,
      disabled: item.disabled ?? false,
    }));

    const derived = await this.buildDerivedItemFields(organizationId, items);

    const saved = await this.screensRepository.replaceItems(
      organizationId,
      id,
      screen.updatedAt,
      derived,
    );

    if (!saved) {
      throw BusinessException.conflict(this.i18n.t('screens.conflict'));
    }

    this.emitContentChanged(organizationId, id);
    if (saved.itemCount > 0) {
      await this.recordContentPublished(organizationId, id);
    }

    const thumbnailUrl = await this.resolveThumbnailUrl(
      organizationId,
      saved.coverMediaId,
    );

    return toScreenDetailWithItemsResponse(saved, thumbnailUrl);
  }

  private recordContentPublished(
    organizationId: string,
    screenId: string,
  ): Promise<void> {
    return this.recordForOrganization(organizationId, {
      eventName: FunnelEventName.CONTENT_PUBLISHED,
      organizationId,
      dedupeKey: `content_published:screen:${screenId}`,
    });
  }

  private async recordForOrganization(
    organizationId: string,
    event: Parameters<AnalyticsService['record']>[0],
  ): Promise<void> {
    const organization =
      await this.organizationsRepository.findById(organizationId);
    await this.analytics.record({
      ...event,
      userId: organization?.ownerUserId?.toString(),
    });
  }

  /**
   * Converts hydrated screen subdocuments into plain item values. Spreading a
   * Mongoose EmbeddedDocument copies its internals ($__, _doc, …) instead of the
   * schema fields, so derived-field computation and the persisted `items` write
   * must operate on plain values pulled explicitly.
   */
  private toItemValues(items: ScreenItemDocument[]): ScreenItemValue[] {
    return items.map((item) => ({
      _id: item._id,
      type: item.type,
      ...(item.mediaId ? { mediaId: item.mediaId } : {}),
      ...(item.playlistId ? { playlistId: item.playlistId } : {}),
      ...(item.appInstanceId ? { appInstanceId: item.appInstanceId } : {}),
      order: item.order,
      ...(item.duration !== undefined ? { duration: item.duration } : {}),
      disabled: item.disabled,
    }));
  }

  /** Type-specific reference + duration fields for a replace-items entry. */
  private buildItemRef(item: ReplaceScreenItemDto): Partial<ScreenItemValue> {
    if (item.type === ScreenItemType.MEDIA) {
      return {
        mediaId: new Types.ObjectId(item.mediaId),
        duration: item.duration ?? DEFAULT_ITEM_DURATION,
      };
    }
    if (item.type === ScreenItemType.APP) {
      return {
        appInstanceId: new Types.ObjectId(item.appInstanceId),
        duration: item.duration ?? DEFAULT_ITEM_DURATION,
      };
    }
    return { playlistId: new Types.ObjectId(item.playlistId) };
  }

  private async buildDerivedItemFields(
    organizationId: string,
    items: ScreenItemValue[],
    session?: ClientSession,
  ) {
    const normalized = items.map((item, index) => ({
      ...item,
      order: index,
    }));

    return {
      items: normalized,
      itemCount: normalized.length,
      totalDuration: normalized.reduce(
        (total, item) =>
          total +
          (item.disabled || item.duration === undefined ? 0 : item.duration),
        0,
      ),
      coverMediaId: await this.resolveCoverMediaId(
        organizationId,
        normalized,
        session,
      ),
    };
  }

  private async resolveCoverMediaId(
    organizationId: string,
    items: ScreenItemValue[],
    session?: ClientSession,
  ): Promise<Types.ObjectId | undefined> {
    const first = items.find((item) => !item.disabled) ?? items[0];
    if (!first) {
      return undefined;
    }

    if (first.type === ScreenItemType.MEDIA && first.mediaId) {
      return first.mediaId;
    }

    if (first.type === ScreenItemType.PLAYLIST && first.playlistId) {
      const playlist = await this.playlistsRepository.findSummaryById(
        organizationId,
        first.playlistId.toString(),
        session,
      );
      return playlist?.coverMediaId;
    }

    return undefined;
  }

  private assertValidItems(dto: ReplaceScreenItemsDto): void {
    for (const item of dto.items) {
      const isValid =
        item.type === ScreenItemType.MEDIA
          ? Boolean(item.mediaId)
          : item.type === ScreenItemType.APP
            ? Boolean(item.appInstanceId)
            : Boolean(item.playlistId);

      if (!isValid) {
        throw BusinessException.badRequest(this.i18n.t('screens.invalidItem'));
      }
    }
  }

  private assertUniqueClientItemIds(dto: ReplaceScreenItemsDto): void {
    const providedIds = dto.items
      .map((item) => item.id)
      .filter((itemId): itemId is string => Boolean(itemId));

    if (new Set(providedIds).size !== providedIds.length) {
      throw BusinessException.badRequest(
        this.i18n.t('screens.duplicateItemIds'),
      );
    }
  }

  private async findScreenOrThrow(
    organizationId: string,
    id: string,
  ): Promise<ScreenDocument> {
    const screen = await this.screensRepository.findById(organizationId, id);

    if (!screen) {
      throw BusinessException.notFound(this.i18n.t('screens.notFound'));
    }

    return screen;
  }

  private async findSummaryOrThrow(
    organizationId: string,
    id: string,
  ): Promise<ScreenDocument> {
    const screen = await this.screensRepository.findSummaryById(
      organizationId,
      id,
    );

    if (!screen) {
      throw BusinessException.notFound(this.i18n.t('screens.notFound'));
    }

    return screen;
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
      throw BusinessException.notFound(this.i18n.t('screens.mediaNotFound'));
    }

    const hasInvalidType = mediaItems.some(
      (item) =>
        item.type !== MediaItemType.IMAGE && item.type !== MediaItemType.VIDEO,
    );

    if (hasInvalidType) {
      throw BusinessException.badRequest(
        this.i18n.t('screens.invalidMediaType'),
      );
    }

    const hasUnavailableMedia = mediaItems.some(
      (item) => item.status !== MediaItemStatus.READY,
    );

    if (hasUnavailableMedia) {
      throw BusinessException.badRequest(this.i18n.t('screens.mediaNotReady'));
    }

    return mediaItems;
  }

  private resolveItemDuration(media: MediaItemDocument): number {
    const duration = media.defaultDuration ?? DEFAULT_ITEM_DURATION;
    return Math.min(MAX_ITEM_DURATION, Math.max(MIN_ITEM_DURATION, duration));
  }

  private async validatePlaylistItems(
    organizationId: string,
    playlistIds: string[],
  ): Promise<void> {
    if (playlistIds.length === 0) {
      return;
    }

    const uniqueIds = [...new Set(playlistIds)];
    const existingIds = await this.playlistsRepository.findExistingIds(
      organizationId,
      uniqueIds,
    );

    if (existingIds.length !== uniqueIds.length) {
      throw BusinessException.notFound(this.i18n.t('screens.playlistNotFound'));
    }
  }

  private async loadThumbnailUrlMap(
    organizationId: string,
    screens: ScreenDocument[],
  ): Promise<Map<string, string>> {
    const mediaIds = [
      ...new Set(
        screens
          .map((screen) => screen.coverMediaId?.toString())
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
    screen: ScreenDocument,
    thumbnailByMediaId: Map<string, string>,
  ): string | undefined {
    const coverMediaId = screen.coverMediaId?.toString();
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
