import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import type {
  AppRenderable,
  AvailabilityRule,
  ImageRenderable,
  PlayerSnapshot,
  Renderable,
  VideoRenderable,
} from '@signagewall/player-contract';

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
import {
  isOverlayLive,
  OVERLAY_SLUGS,
  overlayScreenIds,
} from '../apps/overlay.util';
import { AppInstanceDocument } from '../apps/schemas/app-instance.schema';
import { MediaRepository } from '../media/media.repository';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { PlaylistsRepository } from '../playlists/playlists.repository';
import {
  PlaylistDocument,
  PlaylistItemType,
} from '../playlists/schemas/playlist.schema';
import { ScreensRepository } from '../screens/screens.repository';
import {
  ScreenAvailability,
  ScreenAvailabilityMode,
  ScreenItemDocument,
  ScreenItemType,
} from '../screens/schemas/screen.schema';
import {
  containsPrivateAssetRef,
  PrivateAssetsHydrationService,
} from './private-assets-hydration.service';

const DEFAULT_DURATION_SECONDS = 15;

/**
 * The snapshot/renderable shapes are the canonical contract types from
 * `@signagewall/player-contract` — the single source of truth shared with the player
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

/** Latest connector payload for one coarse cache key, with its freshness. */
interface CachedAppData {
  payload: unknown;
  fetchedAt?: Date;
  /**
   * When the payload last actually CHANGED. What the revision is built from —
   * `fetchedAt` moves on every successful re-fetch, so keying the revision on it
   * made an unchanged feed look like new content to every screen showing it.
   */
  contentAt?: Date;
  stale: boolean;
  /** True while an async connector job is still producing this payload. */
  pending: boolean;
}

/** Connector payloads for a set of app instances, keyed both ways. */
interface AppDataLookup {
  cacheKeyByInstanceId: Map<string, string>;
  cacheByKey: Map<string, CachedAppData>;
}

/** Everything {@link PlayerContentService.buildRenderables} needs, batched once. */
interface RenderableContext extends AppDataLookup {
  mediaById: Map<string, MediaItemDocument>;
  appById: Map<string, AppInstanceDocument>;
  publicBaseUrl: string | undefined;
  revisionParts: string[];
}

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
    @Optional()
    private readonly privateAssets?: PrivateAssetsHydrationService,
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

    const revisionParts: string[] = [];
    const items = await this.buildSnapshotItems(
      organizationId,
      pending,
      revisionParts,
    );

    // Persistent overlay apps assigned to this screen (via their `screens`
    // config), resolved AFTER the rotation so their fingerprint lands in the
    // same revision — an overlay edit re-pushes the snapshot like any other.
    const overlays = await this.resolveOverlays(
      organizationId,
      screenId,
      revisionParts,
    );

    // The availability rule rides in the snapshot AND in the revision: the
    // gateway only re-pushes on reconnect when revisions differ, so without
    // this an availability change made while a device was offline would never
    // reach it.
    const availability = this.toAvailabilityRule(screen.availability);
    revisionParts.push(`availability:${JSON.stringify(availability ?? null)}`);

    // The logical revision is complete before any short-lived signed URL is
    // added. Renewing a signature therefore never looks like new content.
    const revision = this.hashRevision(revisionParts);
    const hydratedItems = await this.hydratePrivateAppPayloads(
      organizationId,
      screenId,
      pending,
      items,
    );
    if (overlays.some((overlay) => containsPrivateAssetRef(overlay.data))) {
      // Overlay assignment uses a different authorization model. Fail closed
      // until a private overlay has an explicit ownership policy.
      throw new Error('Private asset overlays are not supported');
    }

    return {
      screenId: screen._id.toString(),
      name: screen.name,
      revision,
      items: hydratedItems,
      ...(availability ? { availability } : {}),
      ...(overlays.length > 0 ? { overlays } : {}),
    };
  }

  private async hydratePrivateAppPayloads(
    organizationId: string,
    screenId: string,
    pending: PendingEntry[],
    items: PlayerRenderable[],
  ): Promise<PlayerRenderable[]> {
    const appInstanceByRenderableId = new Map(
      pending.flatMap((entry) =>
        entry.kind === 'app' ? [[entry.id, entry.appInstanceId] as const] : [],
      ),
    );

    return Promise.all(
      items.map(async (item) => {
        if (item.kind !== 'app' || !containsPrivateAssetRef(item.data)) {
          return item;
        }
        if (!this.privateAssets) {
          throw new Error('Private asset hydration is not configured');
        }
        const appInstanceId = appInstanceByRenderableId.get(item.id);
        if (!appInstanceId) {
          throw new Error('Private asset app instance could not be resolved');
        }
        const data = await this.privateAssets.hydrateForPlayer({
          organizationId,
          screenId,
          appInstanceId,
          payload: item.data,
        });
        return { ...item, data };
      }),
    );
  }

  /**
   * Resolves a playlist's own items into a flat playable snapshot, standing on
   * its own rather than through a screen. This is what the CMS content preview
   * plays: the operator sees a picture produced by the very same resolver the
   * devices consume, instead of a re-implemented approximation of it.
   *
   * No availability rule and no overlays — both belong to a screen, not to a
   * playlist. `screenId` carries the playlist id: the field is only an identity
   * label on the wire, and a preview never reads it back.
   */
  async resolveByPlaylistId(
    organizationId: string,
    playlistId: string,
  ): Promise<PlayerSnapshot | null> {
    const playlist = await this.playlistsRepository.findById(
      organizationId,
      playlistId,
    );

    if (!playlist) {
      return null;
    }

    const revisionParts: string[] = [];
    const items = await this.buildSnapshotItems(
      organizationId,
      this.collectPlaylistEntries(playlist),
      revisionParts,
    );

    return {
      screenId: playlist._id.toString(),
      name: playlist.name,
      revision: this.hashRevision(revisionParts),
      items,
    };
  }

  /**
   * Batch-loads everything the ordered `pending` entries reference — media docs,
   * app instances and their connector payloads — then renders them in order,
   * appending each item's fingerprint to `revisionParts`.
   */
  private async buildSnapshotItems(
    organizationId: string,
    pending: PendingEntry[],
    revisionParts: string[],
  ): Promise<PlayerRenderable[]> {
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

    const appData = await this.loadAppData([...appById.values()]);

    return this.buildRenderables(pending, {
      mediaById,
      appById,
      ...appData,
      publicBaseUrl: getPublicBaseUrl(this.configService),
      revisionParts,
    });
  }

  /**
   * Loads the latest connector payload for every `server` app instance in
   * `instances`. Instances sharing a coarse cacheKey share one cache entry (the
   * cache is global), so the lookup is keyed by instance id → cacheKey → entry.
   * `static` apps have no cacheKey and are simply absent from both maps.
   */
  private async loadAppData(
    instances: AppInstanceDocument[],
  ): Promise<AppDataLookup> {
    const cacheKeyByInstanceId = new Map<string, string>();
    for (const instance of instances) {
      const cacheKey = cacheKeyForInstance(instance);
      if (cacheKey) {
        cacheKeyByInstanceId.set(instance._id.toString(), cacheKey);
      }
    }

    const cacheByKey = new Map<string, CachedAppData>();
    if (cacheKeyByInstanceId.size === 0) {
      return { cacheKeyByInstanceId, cacheByKey };
    }

    const entries = await this.appDataCacheRepository.findByCacheKeys([
      ...new Set(cacheKeyByInstanceId.values()),
    ]);
    for (const entry of entries) {
      cacheByKey.set(entry.cacheKey, {
        payload: entry.payload,
        ...(entry.fetchedAt ? { fetchedAt: entry.fetchedAt } : {}),
        // Entries written before this field existed have none. Falling back to
        // `fetchedAt` keeps their revision where it was; without the fallback
        // every such app would drop to 0 on the deploy that adds the field, and
        // the whole fleet would take one gratuitous re-push.
        ...((entry.contentAt ?? entry.fetchedAt)
          ? { contentAt: entry.contentAt ?? entry.fetchedAt }
          : {}),
        // A present `lastError` means the newest fetch failed and we're
        // serving last-known-good data.
        stale: Boolean(entry.lastError),
        pending: Boolean(entry.pending),
      });
    }

    return { cacheKeyByInstanceId, cacheByKey };
  }

  /**
   * Resolve the overlay app instances (manifest `overlay: true`) assigned to
   * `screenId` through their `screens` config field, with their latest
   * connector payloads. Each contributes to the revision (config edits, data
   * refreshes and assignment changes all re-push). `durationMs` is 0 — an
   * overlay has no dwell time.
   */
  private async resolveOverlays(
    organizationId: string,
    screenId: string,
    revisionParts: string[],
  ): Promise<AppRenderable[]> {
    if (OVERLAY_SLUGS.size === 0) {
      return [];
    }
    // Asked of the database, not filtered in memory: this runs on every content
    // push AND every device connect, and loading the organization's whole
    // instance collection each time meant a reconnecting fleet did it once per
    // screen.
    const matched = await this.appInstancesRepository.findOverlaysForScreen(
      organizationId,
      [...OVERLAY_SLUGS],
      screenId,
    );
    // The query matches an array element, but it would also match a config whose
    // `screens` is a bare string. Re-applying the reader keeps the assignment
    // rule in exactly one place and the semantics unchanged.
    //
    // `isOverlayLive` then drops a takeover whose switch is off. It has to happen
    // HERE rather than in the bundle: an alert that reaches the snapshot changes
    // the revision every time it is edited and mounts a full-screen iframe on
    // every screen it names. Switched off, it should be as if it did not exist.
    const assigned = matched.filter(
      (instance) =>
        overlayScreenIds(instance.config).includes(screenId) &&
        isOverlayLive(instance.appSlug, instance.config),
    );
    if (assigned.length === 0) {
      return [];
    }

    const { cacheKeyByInstanceId, cacheByKey } =
      await this.loadAppData(assigned);

    const overlays: AppRenderable[] = [];
    for (const instance of assigned) {
      const id = instance._id.toString();
      const cacheKey = cacheKeyByInstanceId.get(id);
      const cached = cacheKey ? cacheByKey.get(cacheKey) : undefined;
      overlays.push({
        id,
        kind: 'app',
        slug: instance.appSlug,
        config: instance.config,
        durationMs: 0,
        ...(cacheKey ? { data: cached?.payload ?? null } : {}),
        ...(cacheKey
          ? {
              dataMeta: {
                ...(cached?.fetchedAt
                  ? { fetchedAt: cached.fetchedAt.toISOString() }
                  : {}),
                stale: cached?.stale ?? false,
                pending: cached?.pending ?? false,
              },
            }
          : {}),
      });
      revisionParts.push(
        `overlay:${id}:${instance.appSlug}:${instance.updatedAt.getTime()}:${cached?.contentAt?.getTime() ?? 0}:${cached?.stale ? 1 : 0}:${cached?.pending ? 1 : 0}`,
      );
    }
    return overlays;
  }

  /**
   * Resolves the ordered pending list into renderables, appending each item's
   * revision fingerprint to the shared revision parts.
   */
  private buildRenderables(
    pending: PendingEntry[],
    context: RenderableContext,
  ): PlayerRenderable[] {
    const items: PlayerRenderable[] = [];
    for (const entry of pending) {
      if (entry.kind === 'media') {
        const media = context.mediaById.get(entry.mediaId);
        const renderable = this.toMediaRenderable(
          entry,
          media,
          context.publicBaseUrl,
        );
        if (!renderable) {
          continue;
        }
        items.push(renderable);
        // Include the media's updatedAt so replacing a file (same id) or editing
        // a playlist changes the revision even when screen.updatedAt is untouched.
        context.revisionParts.push(
          `${renderable.id}:${renderable.kind}:${renderable.url}:${renderable.durationMs}:${media?.updatedAt.getTime() ?? 0}`,
        );
        continue;
      }

      const instance = context.appById.get(entry.appInstanceId);
      if (!instance) {
        continue;
      }
      const durationMs =
        (entry.durationSeconds ?? DEFAULT_DURATION_SECONDS) * 1000;
      const cacheKey = context.cacheKeyByInstanceId.get(entry.appInstanceId);
      const cached = cacheKey ? context.cacheByKey.get(cacheKey) : undefined;
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
                pending: cached?.pending ?? false,
              },
            }
          : {}),
      });
      context.revisionParts.push(
        // Include the payload's fetch time AND staleness so both a refresh and a
        // healthy↔stale transition change the revision and re-push the snapshot.
        `${entry.id}:app:${instance.appSlug}:${durationMs}:${instance.updatedAt.getTime()}:${cached?.contentAt?.getTime() ?? 0}:${cached?.stale ? 1 : 0}:${cached?.pending ? 1 : 0}`,
      );
    }
    return items;
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

        if (playlist) {
          pending.push(...this.collectPlaylistEntries(playlist));
        }
      }
    }

    return pending;
  }

  /**
   * Flattens one playlist's own items into ordered pending entries, using their
   * per-item durations. Shared by the screen path (which expands playlists
   * inline) and the standalone playlist snapshot, so a previewed playlist plays
   * in exactly the order and timing a screen would give it.
   */
  private collectPlaylistEntries(playlist: PlaylistDocument): PendingEntry[] {
    const ordered = [...playlist.items]
      .filter((entry) => !entry.disabled)
      .sort((a, b) => a.order - b.order);

    const pending: PendingEntry[] = [];

    for (const entry of ordered) {
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
