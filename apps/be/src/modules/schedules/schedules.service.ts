import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ClientSession, Types } from 'mongoose';
import { I18nService } from 'nestjs-i18n';

import { BusinessException } from '../../common/exceptions/business.exception';
import { TransactionService } from '../../common/services/transaction.service';
import { MediaRepository } from '../media/media.repository';
import {
  MediaItemStatus,
  MediaItemType,
} from '../media/schemas/media-item.schema';
import { PlaylistsRepository } from '../playlists/playlists.repository';
import { toScreenSummaryResponse } from '../screens/mappers/screen.mapper';
import { ScreensRepository } from '../screens/screens.repository';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { ReplaceScheduleEventsDto } from './dto/replace-schedule-events.dto';
import { ResolveQueryDto } from './dto/resolve-query.dto';
import { ScheduleContentRefDto } from './dto/schedule-content-ref.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import {
  ResolvedWindowResponseDto,
  ScheduleDetailResponseDto,
  ScheduleEventResponseDto,
  ScheduleResolutionResponseDto,
  ScheduleSummaryResponseDto,
  toResolvedWindowsResponse,
  toScheduleDetailResponse,
  toScheduleEventsResponse,
  toScheduleResolutionResponse,
  toScheduleSummaryResponse,
} from './mappers/schedule.mapper';
import {
  EvaluableEvent,
  EvaluableFiller,
  ScheduleEvaluator,
} from './schedule.evaluator';
import { validateScheduleEvents } from './schedule.validation';
import { FillerValue, SchedulesRepository } from './schedules.repository';
import {
  ScheduleContentType,
  ScheduleDocument,
  ScheduleEventType,
  ScheduleEventValue,
  ScheduleFit,
} from './schemas/schedule.schema';

const DEFAULT_TIMEZONE = 'UTC';
const MAX_RESOLVE_RANGE_DAYS = 92;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface ExistingContent {
  media: Set<string>;
  playlists: Set<string>;
}

@Injectable()
export class SchedulesService {
  constructor(
    private readonly schedulesRepository: SchedulesRepository,
    private readonly screensRepository: ScreensRepository,
    @Inject(forwardRef(() => PlaylistsRepository))
    private readonly playlistsRepository: PlaylistsRepository,
    @Inject(forwardRef(() => MediaRepository))
    private readonly mediaRepository: MediaRepository,
    private readonly i18n: I18nService,
    private readonly transactionService: TransactionService,
    private readonly evaluator: ScheduleEvaluator,
  ) {}

  async list(organizationId: string): Promise<ScheduleSummaryResponseDto[]> {
    const schedules =
      await this.schedulesRepository.findAllSummariesByOrganization(
        organizationId,
      );
    return schedules.map(toScheduleSummaryResponse);
  }

  async getById(
    organizationId: string,
    id: string,
  ): Promise<ScheduleDetailResponseDto> {
    const schedule = await this.findSummaryOrThrow(organizationId, id);
    return toScheduleDetailResponse(schedule);
  }

  async getEvents(
    organizationId: string,
    id: string,
  ): Promise<ScheduleEventResponseDto[]> {
    const schedule = await this.findScheduleOrThrow(organizationId, id);
    const existing = await this.loadExistingContent(organizationId, schedule);
    const missing = this.collectMissingEventIds(schedule, existing);
    return toScheduleEventsResponse(schedule, missing);
  }

  async create(
    organizationId: string,
    dto: CreateScheduleDto,
  ): Promise<ScheduleDetailResponseDto> {
    const filler = dto.filler
      ? await this.toFillerValue(organizationId, dto.filler)
      : undefined;

    const schedule = await this.schedulesRepository.create({
      organizationId,
      name: dto.name,
      ...(dto.description ? { description: dto.description } : {}),
      ...(filler ? { filler } : {}),
    });

    return toScheduleDetailResponse(schedule);
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateScheduleDto,
  ): Promise<ScheduleDetailResponseDto> {
    if (
      dto.name === undefined &&
      dto.description === undefined &&
      dto.filler === undefined
    ) {
      throw BusinessException.badRequest(this.i18n.t('schedules.emptyUpdate'));
    }

    const filler =
      dto.filler === undefined
        ? undefined
        : dto.filler === null
          ? null
          : await this.toFillerValue(organizationId, dto.filler);

    const updated = await this.schedulesRepository.updateById(organizationId, id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(filler !== undefined ? { filler } : {}),
    });

    if (!updated) {
      throw BusinessException.notFound(this.i18n.t('schedules.notFound'));
    }
    return toScheduleDetailResponse(updated);
  }

  async deleteMany(organizationId: string, ids: string[]): Promise<void> {
    const uniqueIds = [...new Set(ids)];

    const existingIds = await this.schedulesRepository.findExistingIds(
      organizationId,
      uniqueIds,
    );
    if (existingIds.length !== uniqueIds.length) {
      throw BusinessException.notFound(this.i18n.t('schedules.notFound'));
    }

    await this.transactionService.run(async (session) => {
      await this.screensRepository.clearScheduleAssignments(
        organizationId,
        uniqueIds,
        session,
      );
      await this.schedulesRepository.deleteMany(organizationId, uniqueIds, session);
    });
  }

  async replaceEvents(
    organizationId: string,
    id: string,
    dto: ReplaceScheduleEventsDto,
  ): Promise<ScheduleEventResponseDto[]> {
    const schedule = await this.findScheduleOrThrow(organizationId, id);

    if (
      dto.expectedUpdatedAt !== undefined &&
      schedule.updatedAt.toISOString() !== dto.expectedUpdatedAt
    ) {
      throw BusinessException.conflict(this.i18n.t('schedules.conflict'));
    }

    this.assertUniqueClientEventIds(dto);

    const existingEventIds = new Set(
      schedule.events.map((event) => event._id.toString()),
    );
    for (const event of dto.events) {
      if (event.id && !existingEventIds.has(event.id)) {
        throw BusinessException.notFound(this.i18n.t('schedules.eventNotFound'));
      }
    }

    const events = dto.events.map((event, index) =>
      this.toEventValue(event, index),
    );

    const validationError = validateScheduleEvents(events);
    if (validationError) {
      throw BusinessException.badRequest(
        this.i18n.t(`schedules.event.${validationError}`),
      );
    }

    await this.validateContentRefs(organizationId, events);

    const saved = await this.schedulesRepository.replaceEvents(
      organizationId,
      id,
      schedule.updatedAt,
      { events, eventCount: events.length },
    );
    if (!saved) {
      throw BusinessException.conflict(this.i18n.t('schedules.conflict'));
    }

    return toScheduleEventsResponse(saved);
  }

  /**
   * Sets the complete set of screens a schedule is assigned to. `screen.scheduleId`
   * is authoritative (enforcing one schedule per screen); each affected schedule's
   * `screenIds` cache is recomputed from it inside a transaction (which retries on
   * write-conflicts), so the two sides can never diverge under concurrency.
   */
  async assignScreens(
    organizationId: string,
    id: string,
    requestedScreenIds: string[],
  ): Promise<ScheduleSummaryResponseDto> {
    await this.findSummaryOrThrow(organizationId, id);

    const screenIds = [...new Set(requestedScreenIds)];
    if (screenIds.length > 0) {
      const existing = await this.screensRepository.findExistingIds(
        organizationId,
        screenIds,
      );
      if (existing.length !== screenIds.length) {
        throw BusinessException.notFound(this.i18n.t('schedules.screenNotFound'));
      }
    }

    const scheduleObjectId = new Types.ObjectId(id);

    const updated = await this.transactionService.run(async (session) => {
      // Donors: schedules that currently own a screen we are taking over.
      const links = await this.screensRepository.findScheduleLinksForScreens(
        organizationId,
        screenIds,
        session,
      );
      const donorScheduleIds = [
        ...new Set(
          links
            .filter(
              (link) => link.scheduleId && !link.scheduleId.equals(scheduleObjectId),
            )
            .map((link) => link.scheduleId!.toString()),
        ),
      ];

      // Screens currently owned by this schedule but no longer requested.
      const currentlyOwned =
        await this.screensRepository.findScreenIdsBySchedule(
          organizationId,
          id,
          session,
        );
      const toRelease = currentlyOwned.filter(
        (screenId) => !screenIds.includes(screenId),
      );

      await this.screensRepository.setScreensSchedule(
        organizationId,
        screenIds,
        scheduleObjectId,
        session,
      );
      await this.screensRepository.clearScreensSchedule(
        organizationId,
        toRelease,
        scheduleObjectId,
        session,
      );

      // Reconcile every affected schedule's cache from the authoritative link.
      const affected = [...new Set([id, ...donorScheduleIds])];
      for (const affectedId of affected) {
        const owned = await this.screensRepository.findScreenIdsBySchedule(
          organizationId,
          affectedId,
          session,
        );
        await this.schedulesRepository.setScreenIds(
          organizationId,
          affectedId,
          owned.map((screenId) => new Types.ObjectId(screenId)),
          session,
        );
      }

      return this.schedulesRepository.findSummaryById(organizationId, id, session);
    });

    if (!updated) {
      throw BusinessException.notFound(this.i18n.t('schedules.notFound'));
    }
    return toScheduleSummaryResponse(updated);
  }

  async getAssignedScreens(organizationId: string, id: string) {
    const schedule = await this.findSummaryOrThrow(organizationId, id);
    const screens = await this.screensRepository.findSummariesByIds(
      organizationId,
      schedule.screenIds.map((screenId) => screenId.toString()),
    );
    return screens.map((screen) => toScreenSummaryResponse(screen));
  }

  async resolveForSchedule(
    organizationId: string,
    id: string,
    query: ResolveQueryDto,
  ): Promise<ScheduleResolutionResponseDto | ResolvedWindowResponseDto[]> {
    const schedule = await this.findScheduleOrThrow(organizationId, id);
    const timezone = query.tz ?? (await this.resolveScheduleTimezone(schedule));
    return this.resolveOnSchedule(organizationId, schedule, timezone, query);
  }

  async resolveForScreen(
    organizationId: string,
    screenId: string,
    query: ResolveQueryDto,
  ): Promise<ScheduleResolutionResponseDto | ResolvedWindowResponseDto[]> {
    const screen = await this.screensRepository.findSummaryById(
      organizationId,
      screenId,
    );
    if (!screen) {
      throw BusinessException.notFound(this.i18n.t('schedules.screenNotFound'));
    }

    const timezone = query.tz ?? screen.availability?.timezone ?? DEFAULT_TIMEZONE;

    if (!screen.scheduleId) {
      // No schedule assigned: nothing plays from a schedule perspective.
      return query.from && query.to ? [] : { state: 'off' };
    }

    const schedule = await this.schedulesRepository.findById(
      organizationId,
      screen.scheduleId.toString(),
    );
    if (!schedule) {
      return query.from && query.to ? [] : { state: 'off' };
    }

    return this.resolveOnSchedule(organizationId, schedule, timezone, query);
  }

  // --- content-purge cascades (called from media/playlists delete transactions) ---

  async purgeMediaReferences(
    organizationId: string,
    mediaIds: string[],
    session?: ClientSession,
  ): Promise<void> {
    const uniqueIds = [...new Set(mediaIds)];
    if (uniqueIds.length === 0) {
      return;
    }
    const objectIds = uniqueIds.map((id) => new Types.ObjectId(id));
    const schedules = await this.schedulesRepository.findContainingMedia(
      organizationId,
      uniqueIds,
      session,
    );
    await this.purgeReferences(
      organizationId,
      schedules,
      (event) =>
        event.contentType === ScheduleContentType.MEDIA &&
        Boolean(event.mediaId) &&
        objectIds.some((oid) => oid.equals(event.mediaId!)),
      (schedule) =>
        schedule.filler?.contentType === ScheduleContentType.MEDIA &&
        Boolean(schedule.filler.mediaId) &&
        objectIds.some((oid) => oid.equals(schedule.filler!.mediaId!)),
      session,
    );
  }

  async purgePlaylistReferences(
    organizationId: string,
    playlistIds: string[],
    session?: ClientSession,
  ): Promise<void> {
    const uniqueIds = [...new Set(playlistIds)];
    if (uniqueIds.length === 0) {
      return;
    }
    const objectIds = uniqueIds.map((id) => new Types.ObjectId(id));
    const schedules = await this.schedulesRepository.findContainingPlaylist(
      organizationId,
      uniqueIds,
      session,
    );
    await this.purgeReferences(
      organizationId,
      schedules,
      (event) =>
        event.contentType === ScheduleContentType.PLAYLIST &&
        Boolean(event.playlistId) &&
        objectIds.some((oid) => oid.equals(event.playlistId!)),
      (schedule) =>
        schedule.filler?.contentType === ScheduleContentType.PLAYLIST &&
        Boolean(schedule.filler.playlistId) &&
        objectIds.some((oid) => oid.equals(schedule.filler!.playlistId!)),
      session,
    );
  }

  // --- private helpers ---

  private async purgeReferences(
    organizationId: string,
    schedules: ScheduleDocument[],
    eventMatches: (event: ScheduleDocument['events'][number]) => boolean,
    fillerMatches: (schedule: ScheduleDocument) => boolean,
    session?: ClientSession,
  ): Promise<void> {
    for (const schedule of schedules) {
      const remaining: ScheduleEventValue[] = schedule.events
        .filter((event) => !eventMatches(event))
        .map((event, index) => ({
          _id: event._id,
          type: event.type,
          ...(event.name ? { name: event.name } : {}),
          ...(event.contentType ? { contentType: event.contentType } : {}),
          ...(event.mediaId ? { mediaId: event.mediaId } : {}),
          ...(event.playlistId ? { playlistId: event.playlistId } : {}),
          ...(event.fit ? { fit: event.fit } : {}),
          repeat: event.repeat,
          startDate: event.startDate,
          endDate: event.endDate,
          startTime: event.startTime,
          endTime: event.endTime,
          excludedDates: event.excludedDates ?? [],
          order: index,
        }));

      await this.schedulesRepository.applyContentPurge(
        organizationId,
        schedule._id.toString(),
        remaining,
        fillerMatches(schedule),
        session,
      );
    }
  }

  private async resolveOnSchedule(
    organizationId: string,
    schedule: ScheduleDocument,
    timezone: string,
    query: ResolveQueryDto,
  ): Promise<ScheduleResolutionResponseDto | ResolvedWindowResponseDto[]> {
    const existing = await this.loadExistingContent(organizationId, schedule);
    const events = this.toEvaluableEvents(schedule, existing);
    const filler = this.toEvaluableFiller(schedule, existing);

    if (query.from && query.to) {
      const from = new Date(query.from);
      const to = new Date(query.to);
      if (to <= from) {
        throw BusinessException.badRequest(
          this.i18n.t('schedules.event.invalidDateRange'),
        );
      }
      if (to.getTime() - from.getTime() > MAX_RESOLVE_RANGE_DAYS * MS_PER_DAY) {
        throw BusinessException.badRequest(
          this.i18n.t('schedules.rangeTooLarge'),
        );
      }
      const windows = this.evaluator.getWindows(events, timezone, from, to);
      return toResolvedWindowsResponse(windows);
    }

    const at = query.at ? new Date(query.at) : new Date();
    const resolution = this.evaluator.resolveAt(events, filler, timezone, at);
    return toScheduleResolutionResponse(resolution);
  }

  private async resolveScheduleTimezone(
    schedule: ScheduleDocument,
  ): Promise<string> {
    if (schedule.screenIds.length === 0) {
      return DEFAULT_TIMEZONE;
    }
    const screens = await this.screensRepository.findSummariesByIds(
      schedule.organizationId.toString(),
      schedule.screenIds.map((id) => id.toString()),
    );
    return screens[0]?.availability?.timezone ?? DEFAULT_TIMEZONE;
  }

  private toEvaluableEvents(
    schedule: ScheduleDocument,
    existing: ExistingContent,
  ): EvaluableEvent[] {
    return schedule.events
      .filter(
        (event) =>
          event.type === ScheduleEventType.SCREEN_OFF ||
          this.contentExists(
            event.contentType,
            event.mediaId,
            event.playlistId,
            existing,
          ),
      )
      .map((event) => ({
        id: event._id.toString(),
        type: event.type,
        contentType: event.contentType,
        ...(event.mediaId ? { mediaId: event.mediaId.toString() } : {}),
        ...(event.playlistId ? { playlistId: event.playlistId.toString() } : {}),
        fit: event.fit,
        repeat: event.repeat,
        startDate: event.startDate,
        endDate: event.endDate,
        startTime: event.startTime,
        endTime: event.endTime,
        excludedDates: event.excludedDates ?? [],
        order: event.order,
      }));
  }

  private toEvaluableFiller(
    schedule: ScheduleDocument,
    existing: ExistingContent,
  ): EvaluableFiller | undefined {
    const { filler } = schedule;
    if (
      !filler ||
      !this.contentExists(
        filler.contentType,
        filler.mediaId,
        filler.playlistId,
        existing,
      )
    ) {
      return undefined;
    }
    return {
      contentType: filler.contentType,
      ...(filler.mediaId ? { mediaId: filler.mediaId.toString() } : {}),
      ...(filler.playlistId ? { playlistId: filler.playlistId.toString() } : {}),
      fit: filler.fit,
    };
  }

  private collectMissingEventIds(
    schedule: ScheduleDocument,
    existing: ExistingContent,
  ): Set<string> {
    const missing = new Set<string>();
    for (const event of schedule.events) {
      if (
        event.type === ScheduleEventType.CONTENT &&
        !this.contentExists(
          event.contentType,
          event.mediaId,
          event.playlistId,
          existing,
        )
      ) {
        missing.add(event._id.toString());
      }
    }
    return missing;
  }

  private contentExists(
    contentType: ScheduleContentType | undefined,
    mediaId: Types.ObjectId | undefined,
    playlistId: Types.ObjectId | undefined,
    existing: ExistingContent,
  ): boolean {
    if (contentType === ScheduleContentType.MEDIA) {
      return Boolean(mediaId && existing.media.has(mediaId.toString()));
    }
    if (contentType === ScheduleContentType.PLAYLIST) {
      return Boolean(playlistId && existing.playlists.has(playlistId.toString()));
    }
    return false;
  }

  private async loadExistingContent(
    organizationId: string,
    schedule: ScheduleDocument,
  ): Promise<ExistingContent> {
    const mediaIds = new Set<string>();
    const playlistIds = new Set<string>();
    const collect = (
      contentType: ScheduleContentType | undefined,
      mediaId?: Types.ObjectId,
      playlistId?: Types.ObjectId,
    ) => {
      if (contentType === ScheduleContentType.MEDIA && mediaId) {
        mediaIds.add(mediaId.toString());
      }
      if (contentType === ScheduleContentType.PLAYLIST && playlistId) {
        playlistIds.add(playlistId.toString());
      }
    };
    for (const event of schedule.events) {
      collect(event.contentType, event.mediaId, event.playlistId);
    }
    if (schedule.filler) {
      collect(
        schedule.filler.contentType,
        schedule.filler.mediaId,
        schedule.filler.playlistId,
      );
    }

    const [media, playlists] = await Promise.all([
      mediaIds.size > 0
        ? this.mediaRepository.findByIds(organizationId, [...mediaIds])
        : Promise.resolve([]),
      playlistIds.size > 0
        ? this.playlistsRepository.findExistingIds(organizationId, [...playlistIds])
        : Promise.resolve([]),
    ]);

    return {
      media: new Set(media.map((item) => item._id.toString())),
      playlists: new Set(playlists),
    };
  }

  private toEventValue(
    event: ReplaceScheduleEventsDto['events'][number],
    index: number,
  ): ScheduleEventValue {
    const isContent = event.type === ScheduleEventType.CONTENT;
    return {
      _id: event.id ? new Types.ObjectId(event.id) : new Types.ObjectId(),
      type: event.type,
      ...(event.name !== undefined ? { name: event.name } : {}),
      ...(event.contentType !== undefined
        ? { contentType: event.contentType }
        : {}),
      ...(event.mediaId ? { mediaId: new Types.ObjectId(event.mediaId) } : {}),
      ...(event.playlistId
        ? { playlistId: new Types.ObjectId(event.playlistId) }
        : {}),
      ...(isContent ? { fit: event.fit ?? ScheduleFit.FIT } : {}),
      repeat: event.repeat,
      startDate: event.startDate,
      endDate: event.endDate,
      startTime: event.startTime,
      endTime: event.endTime,
      excludedDates: event.excludedDates ?? [],
      order: index,
    };
  }

  private assertUniqueClientEventIds(dto: ReplaceScheduleEventsDto): void {
    const ids = dto.events
      .map((event) => event.id)
      .filter((id): id is string => Boolean(id));
    if (new Set(ids).size !== ids.length) {
      throw BusinessException.badRequest(
        this.i18n.t('schedules.duplicateEventIds'),
      );
    }
  }

  private async validateContentRefs(
    organizationId: string,
    events: ScheduleEventValue[],
  ): Promise<void> {
    const contentEvents = events.filter(
      (event) => event.type === ScheduleEventType.CONTENT,
    );
    const mediaIds = contentEvents
      .filter((event) => event.contentType === ScheduleContentType.MEDIA)
      .map((event) => event.mediaId!.toString());
    const playlistIds = contentEvents
      .filter((event) => event.contentType === ScheduleContentType.PLAYLIST)
      .map((event) => event.playlistId!.toString());

    await Promise.all([
      this.validateMediaItems(organizationId, mediaIds),
      this.validatePlaylistItems(organizationId, playlistIds),
    ]);
  }

  private async toFillerValue(
    organizationId: string,
    dto: ScheduleContentRefDto,
  ): Promise<FillerValue> {
    if (dto.contentType === ScheduleContentType.MEDIA) {
      if (!dto.mediaId) {
        throw BusinessException.badRequest(
          this.i18n.t('schedules.event.missingContent'),
        );
      }
      await this.validateMediaItems(organizationId, [dto.mediaId]);
      return {
        contentType: ScheduleContentType.MEDIA,
        mediaId: new Types.ObjectId(dto.mediaId),
        fit: dto.fit ?? ScheduleFit.FIT,
      };
    }
    if (!dto.playlistId) {
      throw BusinessException.badRequest(
        this.i18n.t('schedules.event.missingContent'),
      );
    }
    await this.validatePlaylistItems(organizationId, [dto.playlistId]);
    return {
      contentType: ScheduleContentType.PLAYLIST,
      playlistId: new Types.ObjectId(dto.playlistId),
      fit: dto.fit ?? ScheduleFit.FIT,
    };
  }

  private async validateMediaItems(
    organizationId: string,
    mediaIds: string[],
  ): Promise<void> {
    if (mediaIds.length === 0) {
      return;
    }
    const uniqueIds = [...new Set(mediaIds)];
    const items = await this.mediaRepository.findByIds(organizationId, uniqueIds);

    if (items.length !== uniqueIds.length) {
      throw BusinessException.notFound(this.i18n.t('schedules.mediaNotFound'));
    }
    if (
      items.some(
        (item) =>
          item.type !== MediaItemType.IMAGE && item.type !== MediaItemType.VIDEO,
      )
    ) {
      throw BusinessException.badRequest(
        this.i18n.t('schedules.invalidMediaType'),
      );
    }
    if (items.some((item) => item.status !== MediaItemStatus.READY)) {
      throw BusinessException.badRequest(this.i18n.t('schedules.mediaNotReady'));
    }
  }

  private async validatePlaylistItems(
    organizationId: string,
    playlistIds: string[],
  ): Promise<void> {
    if (playlistIds.length === 0) {
      return;
    }
    const uniqueIds = [...new Set(playlistIds)];
    const existing = await this.playlistsRepository.findExistingIds(
      organizationId,
      uniqueIds,
    );
    if (existing.length !== uniqueIds.length) {
      throw BusinessException.notFound(this.i18n.t('schedules.playlistNotFound'));
    }
  }

  private async findScheduleOrThrow(
    organizationId: string,
    id: string,
  ): Promise<ScheduleDocument> {
    const schedule = await this.schedulesRepository.findById(organizationId, id);
    if (!schedule) {
      throw BusinessException.notFound(this.i18n.t('schedules.notFound'));
    }
    return schedule;
  }

  private async findSummaryOrThrow(
    organizationId: string,
    id: string,
  ): Promise<ScheduleDocument> {
    const schedule = await this.schedulesRepository.findSummaryById(
      organizationId,
      id,
    );
    if (!schedule) {
      throw BusinessException.notFound(this.i18n.t('schedules.notFound'));
    }
    return schedule;
  }
}
