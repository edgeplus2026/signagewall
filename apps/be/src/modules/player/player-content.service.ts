import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import type {
  AvailabilityRule,
  ImageRenderable,
  PlayerSnapshot,
  Renderable,
  VideoRenderable,
} from '@edge/player-contract';

import {
  getPublicBaseUrl,
  toMediaItemResponse,
} from '../media/mappers/media.mapper';
import {
  MediaItemDocument,
  MediaItemStatus,
  MediaItemType,
} from '../media/schemas/media-item.schema';
import { AppDataCacheRepository } from '../apps/app-data-cache.repository';
import { AppInstancesRepository } from '../apps/app-instances.repository';
import { cacheKeyForInstance } from '../apps/connectors/cache-key.util';
import { AppInstanceDocument } from '../apps/schemas/app-instance.schema';
import { MediaRepository } from '../media/media.repository';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { PlaylistsRepository } from '../playlists/playlists.repository';
import { PlaylistItemType } from '../playlists/schemas/playlist.schema';
import { ScreensRepository } from '../screens/screens.repository';
import {
  ScreenAvailability,
  ScreenAvailabilityMode,
  ScreenItemDocument,
  ScreenItemType,
} from '../screens/schemas/screen.schema';

const DEFAULT_DURATION_SECONDS = 15;

/**
 * The snapshot/renderable shapes are the canonical contract types from
 * `@edge/player-contract` — the single source of truth shared with the player
 * and CMS. `PlayerRenderable` is re-exported under its historical BE name.
 */
export type { PlayerSnapshot };
export type PlayerRenderable = Renderable;

/** An ordered, still-to-resolve screen entry (a media ref or an app instance). */
interface PendingMediaEntry {
  kind: 'media';
  id: string;
  mediaId: string;
  durationSeconds?: number;
}

interface PendingAppEntry {
  kind: 'app';
  id: string;
  appInstanceId: string;
  durationSeconds?: number;
}

type PendingEntry = PendingMediaEntry | PendingAppEntry;

@Injectable()
export class PlayerContentService {
  constructor(
    private readonly screensRepository: ScreensRepository,
    private readonly playlistsRepository: PlaylistsRepository,
    private readonly mediaRepository: MediaRepository,
    private readonly appInstancesRepository: AppInstancesRepository,
    private readonly appDataCacheRepository: AppDataCacheRepository,
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Resolves a screen's items (expanding playlists, dereferencing media to
   * public R2 URLs, dropping disabled/processing/missing entries) into a flat
   * playable snapshot. Returns `null` when the screen does not exist.
   */
  async resolveByScreenId(
    organizationId: string,
    screenId: string,
  ): Promise<PlayerSnapshot | null> {
    const screen = await this.screensRepository.findById(
      organizationId,
      screenId,
    );

    if (!screen) {
      return null;
    }

    // Org queued for GDPR deletion (soft-deleted): keep the device paired — so
    // cancelling within the grace period restores content instantly — but serve
    // an empty snapshot so its screens stop showing content immediately.
    // `findById` returns null for soft-deleted orgs.
    const organization =
      await this.organizationsRepository.findById(organizationId);
    if (!organization) {
      // Still carry the availability rule: without it the player would fall
      // back to always-on and a screen that should be dark (outside working
      // hours) would light up the branded splash instead of staying black.
      const availability = this.toAvailabilityRule(screen.availability);
      return {
        screenId: screen._id.toString(),
        name: screen.name,
        revision: 'org-pending-deletion',
        items: [],
        ...(availability ? { availability } : {}),
      };
    }

    const pending = await this.collectPendingItems(
      organizationId,
      screen.items,
    );

    const [mediaById, appById] = await Promise.all([
      this.loadMediaMap(
        organizationId,
        pending.flatMap((entry) =>
          entry.kind === 'media' ? [entry.mediaId] : [],
        ),
      ),
      this.loadAppMap(
        organizationId,
        pending.flatMap((entry) =>
          entry.kind === 'app' ? [entry.appInstanceId] : [],
        ),
      ),
    ]);

    // Load connector payloads for the `server` app instances on this screen.
    // Instances sharing a coarse cacheKey share one cache entry (global cache).
    const cacheKeyByInstanceId = new Map<string, string>();
    for (const instance of appById.values()) {
      const cacheKey = cacheKeyForInstance(instance);
      if (cacheKey) {
        cacheKeyByInstanceId.set(instance._id.toString(), cacheKey);
      }
    }
    const cacheByKey = new Map<
      string,
      { payload: unknown; fetchedAt?: Date; stale: boolean }
    >();
    if (cacheKeyByInstanceId.size > 0) {
      const entries = await this.appDataCacheRepository.findByCacheKeys([
        ...new Set(cacheKeyByInstanceId.values()),
      ]);
      for (const entry of entries) {
        cacheByKey.set(entry.cacheKey, {
          payload: entry.payload,
          ...(entry.fetchedAt ? { fetchedAt: entry.fetchedAt } : {}),
          // A present `lastError` means the newest fetch failed and we're
          // serving last-known-good data.
          stale: Boolean(entry.lastError),
        });
      }
    }

    const publicBaseUrl = getPublicBaseUrl(this.configService);
    const items: PlayerRenderable[] = [];
    const revisionParts: string[] = [];

    for (const entry of pending) {
      if (entry.kind === 'media') {
        const media = mediaById.get(entry.mediaId);
        const renderable = this.toMediaRenderable(entry, media, publicBaseUrl);
        if (!renderable) {
          continue;
        }
        items.push(renderable);
        // Include the media's updatedAt so replacing a file (same id) or editing
        // a playlist changes the revision even when screen.updatedAt is untouched.
        revisionParts.push(
          `${renderable.id}:${renderable.kind}:${renderable.url}:${renderable.durationMs}:${media?.updatedAt.getTime() ?? 0}`,
        );
        continue;
      }

      const instance = appById.get(entry.appInstanceId);
      if (!instance) {
        continue;
      }
      const durationMs =
        (entry.durationSeconds ?? DEFAULT_DURATION_SECONDS) * 1000;
      const cacheKey = cacheKeyByInstanceId.get(entry.appInstanceId);
      const cached = cacheKey ? cacheByKey.get(cacheKey) : undefined;
      items.push({
        id: entry.id,
        kind: 'app',
        slug: instance.appSlug,
        config: instance.config,
        durationMs,
        // `server` apps carry their latest connector payload (null until the
        // first fetch); `static` apps have no cacheKey and stay absent.
        ...(cacheKey ? { data: cached?.payload ?? null } : {}),
        ...(cacheKey
          ? {
              dataMeta: {
                ...(cached?.fetchedAt
                  ? { fetchedAt: cached.fetchedAt.toISOString() }
                  : {}),
                stale: cached?.stale ?? false,
              },
            }
          : {}),
      });
      revisionParts.push(
        // Include the payload's fetch time AND staleness so both a refresh and a
        // healthy↔stale transition change the revision and re-push the snapshot.
        `${entry.id}:app:${instance.appSlug}:${durationMs}:${instance.updatedAt.getTime()}:${cached?.fetchedAt?.getTime() ?? 0}:${cached?.stale ? 1 : 0}`,
      );
    }

    // The availability rule rides in the snapshot AND in the revision: the
    // gateway only re-pushes on reconnect when revisions differ, so without
    // this an availability change made while a device was offline would never
    // reach it.
    const availability = this.toAvailabilityRule(screen.availability);
    revisionParts.push(`availability:${JSON.stringify(availability ?? null)}`);

    return {
      screenId: screen._id.toString(),
      name: screen.name,
      revision: this.hashRevision(revisionParts),
      items,
      ...(availability ? { availability } : {}),
    };
  }

  /**
   * Maps the stored availability subdocument to the wire rule the player
   * evaluates locally. Only the active block is sent, and only its meaningful
   * fields: the inactive block, and disabled weekly days (which carry
   * placeholder times), are CMS bookkeeping and must not churn the revision.
   * Missing/garbage sub-blocks degrade to always-on (fail open) rather than
   * throwing — a signage device must never be bricked by a bad document.
   */
  private toAvailabilityRule(
    availability: ScreenAvailability | undefined,
  ): AvailabilityRule | undefined {
    if (!availability) {
      return undefined;
    }
    if (availability.mode === ScreenAvailabilityMode.WEEKLY) {
      return {
        mode: 'weekly',
        timezone: availability.timezone,
        // Enabled days only: the evaluator ignores disabled ones, and sending
        // them would leak their placeholder hours into the revision hash so a
        // cosmetic edit to a day that stays off would needlessly re-push.
        weekly: (availability.weekly ?? [])
          .filter((day) => day.enabled)
          .map((day) => ({
            day: day.day,
            enabled: true,
            start: day.start,
            end: day.end,
          })),
      };
    }
    if (
      availability.mode === ScreenAvailabilityMode.SPECIAL &&
      availability.special
    ) {
      return {
        mode: 'special',
        timezone: availability.timezone,
        special: {
          startDate: availability.special.startDate,
          endDate: availability.special.endDate,
          start: availability.special.start,
          end: availability.special.end,
        },
      };
    }
    return { mode: 'always', timezone: availability.timezone };
  }

  /**
   * Flattens a screen's items into an ordered list of media references. Playlist
   * items are expanded inline using their own per-item durations.
   */
  private async collectPendingItems(
    organizationId: string,
    items: ScreenItemDocument[],
  ): Promise<PendingEntry[]> {
    const ordered = [...items]
      .filter((item) => !item.disabled)
      .sort((a, b) => a.order - b.order);

    const pending: PendingEntry[] = [];

    for (const item of ordered) {
      if (item.type === ScreenItemType.MEDIA && item.mediaId) {
        pending.push({
          kind: 'media',
          id: item._id.toString(),
          mediaId: item.mediaId.toString(),
          ...(item.duration !== undefined
            ? { durationSeconds: item.duration }
            : {}),
        });
        continue;
      }

      if (item.type === ScreenItemType.APP && item.appInstanceId) {
        pending.push({
          kind: 'app',
          id: item._id.toString(),
          appInstanceId: item.appInstanceId.toString(),
          ...(item.duration !== undefined
            ? { durationSeconds: item.duration }
            : {}),
        });
        continue;
      }

      if (item.type === ScreenItemType.PLAYLIST && item.playlistId) {
        const playlist = await this.playlistsRepository.findById(
          organizationId,
          item.playlistId.toString(),
        );

        if (!playlist) {
          continue;
        }

        const playlistItems = [...playlist.items]
          .filter((entry) => !entry.disabled)
          .sort((a, b) => a.order - b.order);

        for (const entry of playlistItems) {
          if (entry.type === PlaylistItemType.APP && entry.appInstanceId) {
            pending.push({
              kind: 'app',
              id: entry._id.toString(),
              appInstanceId: entry.appInstanceId.toString(),
              durationSeconds: entry.duration,
            });
            continue;
          }
          // Media item (also the default for legacy entries without a `type`).
          if (entry.mediaId) {
            pending.push({
              kind: 'media',
              id: entry._id.toString(),
              mediaId: entry.mediaId.toString(),
              durationSeconds: entry.duration,
            });
          }
        }
      }
    }

    return pending;
  }

  private async loadMediaMap(
    organizationId: string,
    mediaIds: string[],
  ): Promise<Map<string, MediaItemDocument>> {
    const uniqueIds = [...new Set(mediaIds)];

    if (uniqueIds.length === 0) {
      return new Map();
    }

    const docs = await this.mediaRepository.findByIds(
      organizationId,
      uniqueIds,
    );
    return new Map(docs.map((doc) => [doc._id.toString(), doc]));
  }

  private async loadAppMap(
    organizationId: string,
    appInstanceIds: string[],
  ): Promise<Map<string, AppInstanceDocument>> {
    const uniqueIds = [...new Set(appInstanceIds)];

    if (uniqueIds.length === 0) {
      return new Map();
    }

    const docs = await this.appInstancesRepository.findByIds(
      organizationId,
      uniqueIds,
    );
    return new Map(docs.map((doc) => [doc._id.toString(), doc]));
  }

  private toMediaRenderable(
    entry: PendingMediaEntry,
    media: MediaItemDocument | undefined,
    publicBaseUrl: string | undefined,
  ): ImageRenderable | VideoRenderable | null {
    if (!media || media.status !== MediaItemStatus.READY) {
      return null;
    }

    const mapped = toMediaItemResponse(media, publicBaseUrl);

    if (!mapped.fileUrl) {
      return null;
    }

    const durationMs =
      (entry.durationSeconds ??
        media.defaultDuration ??
        DEFAULT_DURATION_SECONDS) * 1000;

    if (media.type === MediaItemType.IMAGE) {
      return {
        id: entry.id,
        kind: 'image',
        // Serve the 1280px WebP variant instead of the (up to 2560px) original:
        // it covers any <=1080p signage screen, decodes far faster, and is a
        // fraction of the bytes — lighter on the player's media cache and quota.
        // Fall back to the original if the variant is somehow missing.
        url: mapped.thumbnailLargeUrl ?? mapped.fileUrl,
        durationMs,
        ...(media.width !== undefined ? { width: media.width } : {}),
        ...(media.height !== undefined ? { height: media.height } : {}),
      };
    }

    if (media.type === MediaItemType.VIDEO) {
      return {
        id: entry.id,
        kind: 'video',
        url: mapped.fileUrl,
        durationMs,
        ...(media.mimeType ? { mimeType: media.mimeType } : {}),
        ...(media.width !== undefined ? { width: media.width } : {}),
        ...(media.height !== undefined ? { height: media.height } : {}),
      };
    }

    return null;
  }

  private hashRevision(parts: string[]): string {
    return crypto
      .createHash('sha1')
      .update(parts.join('|'))
      .digest('hex')
      .slice(0, 16);
  }
}
