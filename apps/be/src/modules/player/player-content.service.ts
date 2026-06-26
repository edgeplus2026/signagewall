import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import {
  getPublicBaseUrl,
  toMediaItemResponse,
} from '../media/mappers/media.mapper';
import {
  MediaItemDocument,
  MediaItemStatus,
  MediaItemType,
} from '../media/schemas/media-item.schema';
import { AppInstancesRepository } from '../apps/app-instances.repository';
import { AppInstanceDocument } from '../apps/schemas/app-instance.schema';
import { MediaRepository } from '../media/media.repository';
import { PlaylistsRepository } from '../playlists/playlists.repository';
import { ScreensRepository } from '../screens/screens.repository';
import {
  ScreenItemDocument,
  ScreenItemType,
} from '../screens/schemas/screen.schema';

const DEFAULT_DURATION_SECONDS = 15;

export interface ImageRenderable {
  id: string;
  kind: 'image';
  url: string;
  durationMs: number;
  width?: number;
  height?: number;
}

export interface VideoRenderable {
  id: string;
  kind: 'video';
  url: string;
  durationMs: number;
  mimeType?: string;
  width?: number;
  height?: number;
}

export interface AppRenderable {
  id: string;
  kind: 'app';
  slug: string;
  config: Record<string, unknown>;
  durationMs: number;
}

export type PlayerRenderable =
  | ImageRenderable
  | VideoRenderable
  | AppRenderable;

/**
 * The denormalized, ready-to-play view of a screen the player consumes. The
 * player makes ONE call (or one socket push) and plays it as a flat loop — no
 * N+1 resolution of playlists/media on the device. `revision` lets both sides
 * cheaply detect whether content actually changed.
 */
export interface PlayerSnapshot {
  screenId: string;
  name: string;
  revision: string;
  items: PlayerRenderable[];
}

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
      items.push({
        id: entry.id,
        kind: 'app',
        slug: instance.appSlug,
        config: instance.config,
        durationMs,
      });
      revisionParts.push(
        `${entry.id}:app:${instance.appSlug}:${durationMs}:${instance.updatedAt.getTime()}`,
      );
    }

    return {
      screenId: screen._id.toString(),
      name: screen.name,
      revision: this.hashRevision(revisionParts),
      items,
    };
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
          pending.push({
            kind: 'media',
            id: entry._id.toString(),
            mediaId: entry.mediaId.toString(),
            durationSeconds: entry.duration,
          });
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
