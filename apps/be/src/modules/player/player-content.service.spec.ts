import { Types } from 'mongoose';

import {
  MediaItemStatus,
  MediaItemType,
} from '../media/schemas/media-item.schema';
import { ScreenItemType } from '../screens/schemas/screen.schema';
import { PlayerContentService } from './player-content.service';

/** Minimal stand-ins for the Mongoose documents the resolver reads. */
function media(overrides: Partial<MediaDoc> & { id: string }): MediaDoc {
  return {
    _id: new Types.ObjectId(),
    name: overrides.id,
    type: MediaItemType.IMAGE,
    parentId: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z'),
    storageKey: `${overrides.id}.jpg`,
    status: MediaItemStatus.READY,
    source: 'local',
    ...overrides,
  };
}

interface MediaDoc {
  _id: Types.ObjectId;
  name: string;
  type: MediaItemType;
  parentId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
  storageKey?: string;
  thumbnailSmallKey?: string;
  thumbnailLargeKey?: string;
  width?: number;
  height?: number;
  defaultDuration?: number;
  mimeType?: string;
  status: MediaItemStatus;
  source: string;
  id: string;
}

interface AppInstanceDoc {
  _id: Types.ObjectId;
  appSlug: string;
  config: Record<string, unknown>;
  updatedAt: Date;
}

function buildService(options: {
  screenItems: unknown[];
  playlists?: Record<string, unknown[]>;
  mediaById: Record<string, MediaDoc>;
  appsById?: Record<string, AppInstanceDoc>;
}) {
  const screensRepository = {
    findById: jest.fn().mockResolvedValue({
      _id: new Types.ObjectId(),
      name: 'Lobby',
      organizationId: new Types.ObjectId(),
      items: options.screenItems,
    }),
  };
  const playlistsRepository = {
    findById: jest.fn((_org: string, id: string) =>
      Promise.resolve(
        options.playlists?.[id]
          ? { _id: new Types.ObjectId(), items: options.playlists[id] }
          : null,
      ),
    ),
  };
  const mediaRepository = {
    findByIds: jest.fn((_org: string, ids: string[]) =>
      Promise.resolve(ids.map((id) => options.mediaById[id]).filter(Boolean)),
    ),
  };
  const appInstancesRepository = {
    findByIds: jest.fn((_org: string, ids: string[]) =>
      Promise.resolve(ids.map((id) => options.appsById?.[id]).filter(Boolean)),
    ),
  };
  const configService = { get: jest.fn().mockReturnValue('https://cdn.test') };

  return new PlayerContentService(
    screensRepository as never,
    playlistsRepository as never,
    mediaRepository as never,
    appInstancesRepository as never,
    configService as never,
  );
}

function screenMediaItem(
  mediaKey: MediaDoc,
  order: number,
  opts: { duration?: number; disabled?: boolean } = {},
) {
  return {
    _id: new Types.ObjectId(),
    type: ScreenItemType.MEDIA,
    mediaId: mediaKey._id,
    order,
    disabled: opts.disabled ?? false,
    ...(opts.duration !== undefined ? { duration: opts.duration } : {}),
  };
}

describe('PlayerContentService', () => {
  it('flattens screen items, dropping disabled and not-ready media', async () => {
    const image = media({ id: 'image', type: MediaItemType.IMAGE });
    const video = media({
      id: 'video',
      type: MediaItemType.VIDEO,
      storageKey: 'video.mp4',
      mimeType: 'video/mp4',
    });
    const disabledImage = media({ id: 'disabled', type: MediaItemType.IMAGE });
    const processing = media({
      id: 'processing',
      status: MediaItemStatus.PROCESSING,
    });

    const service = buildService({
      mediaById: {
        [image._id.toString()]: image,
        [video._id.toString()]: video,
        [disabledImage._id.toString()]: disabledImage,
        [processing._id.toString()]: processing,
      },
      screenItems: [
        screenMediaItem(image, 0, { duration: 10 }),
        screenMediaItem(video, 1, { duration: 20 }),
        screenMediaItem(disabledImage, 2, { duration: 5, disabled: true }),
        screenMediaItem(processing, 3, { duration: 5 }),
      ],
    });

    const snapshot = await service.resolveByScreenId('org', 'screen');

    expect(snapshot).not.toBeNull();
    expect(snapshot?.items).toHaveLength(2);
    expect(snapshot?.items[0]).toMatchObject({
      kind: 'image',
      durationMs: 10_000,
      url: 'https://cdn.test/image.jpg',
    });
    expect(snapshot?.items[1]).toMatchObject({
      kind: 'video',
      durationMs: 20_000,
      mimeType: 'video/mp4',
    });
  });

  it('serves the 1280px image variant, falling back to the original', async () => {
    const withThumb = media({
      id: 'withThumb',
      type: MediaItemType.IMAGE,
      storageKey: 'orig.webp',
      thumbnailLargeKey: 'orig-large.webp',
    });
    const noThumb = media({
      id: 'noThumb',
      type: MediaItemType.IMAGE,
      storageKey: 'plain.webp',
    });

    const service = buildService({
      mediaById: {
        [withThumb._id.toString()]: withThumb,
        [noThumb._id.toString()]: noThumb,
      },
      screenItems: [
        screenMediaItem(withThumb, 0),
        screenMediaItem(noThumb, 1),
      ],
    });

    const snapshot = await service.resolveByScreenId('org', 'screen');

    // Prefers the 1280px large thumbnail when present...
    expect(snapshot?.items[0]).toMatchObject({
      kind: 'image',
      url: 'https://cdn.test/orig-large.webp',
    });
    // ...and falls back to the original when it is not.
    expect(snapshot?.items[1]).toMatchObject({
      kind: 'image',
      url: 'https://cdn.test/plain.webp',
    });
  });

  it('expands playlist items inline using their own durations', async () => {
    const direct = media({ id: 'direct' });
    const inPlaylist = media({ id: 'inPlaylist' });

    const service = buildService({
      mediaById: {
        [direct._id.toString()]: direct,
        [inPlaylist._id.toString()]: inPlaylist,
      },
      screenItems: [
        screenMediaItem(direct, 0, { duration: 8 }),
        {
          _id: new Types.ObjectId(),
          type: ScreenItemType.PLAYLIST,
          playlistId: new Types.ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
          order: 1,
          disabled: false,
        },
      ],
      playlists: {
        aaaaaaaaaaaaaaaaaaaaaaaa: [
          {
            _id: new Types.ObjectId(),
            mediaId: inPlaylist._id,
            order: 0,
            duration: 4,
            disabled: false,
          },
        ],
      },
    });

    const snapshot = await service.resolveByScreenId('org', 'screen');

    expect(snapshot?.items.map((item) => item.durationMs)).toEqual([
      8_000, 4_000,
    ]);
  });

  it('resolves an app item to an app renderable with its config', async () => {
    const appInstanceId = new Types.ObjectId();
    const service = buildService({
      mediaById: {},
      appsById: {
        [appInstanceId.toString()]: {
          _id: appInstanceId,
          appSlug: 'youtube',
          config: { url: 'https://youtu.be/abc' },
          updatedAt: new Date('2024-03-01T00:00:00Z'),
        },
      },
      screenItems: [
        {
          _id: new Types.ObjectId(),
          type: ScreenItemType.APP,
          appInstanceId,
          order: 0,
          duration: 30,
          disabled: false,
        },
      ],
    });

    const snapshot = await service.resolveByScreenId('org', 'screen');

    expect(snapshot?.items).toHaveLength(1);
    expect(snapshot?.items[0]).toMatchObject({
      kind: 'app',
      slug: 'youtube',
      config: { url: 'https://youtu.be/abc' },
      durationMs: 30_000,
    });
  });

  it('produces a stable revision that changes when media changes', async () => {
    const image = media({ id: 'image' });
    // Reuse the same screen items (stable ids, as persisted) across builds.
    const items = [screenMediaItem(image, 0, { duration: 10 })];
    const build = (mediaDoc: MediaDoc) =>
      buildService({
        mediaById: { [mediaDoc._id.toString()]: mediaDoc },
        screenItems: items,
      });

    const first = await build(image).resolveByScreenId('org', 'screen');
    const second = await build(image).resolveByScreenId('org', 'screen');
    expect(first?.revision).toBe(second?.revision);

    // Same id, but the file was replaced (updatedAt bumped) → revision changes.
    const changed = media({
      id: 'image',
      _id: image._id,
      updatedAt: new Date('2025-06-01T00:00:00Z'),
    });
    const third = await build(changed).resolveByScreenId('org', 'screen');

    expect(third?.revision).not.toBe(first?.revision);
  });
});
