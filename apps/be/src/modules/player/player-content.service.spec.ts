import { Types } from 'mongoose';

import {
  MediaItemStatus,
  MediaItemType,
} from '../media/schemas/media-item.schema';
import { PlaylistItemType } from '../playlists/schemas/playlist.schema';
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
  /** Cache entries keyed by connector cacheKey, for `server` app data. */
  cacheByKey?: Record<
    string,
    { payload: unknown; fetchedAt?: Date; lastError?: string }
  >;
  /** Stored `screen.availability` subdocument, when the screen has one. */
  availability?: unknown;
}) {
  const screensRepository = {
    findById: jest.fn().mockResolvedValue({
      _id: new Types.ObjectId(),
      name: 'Lobby',
      organizationId: new Types.ObjectId(),
      items: options.screenItems,
      ...(options.availability ? { availability: options.availability } : {}),
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
  const appDataCacheRepository = {
    findByCacheKeys: jest.fn((keys: string[]) =>
      Promise.resolve(
        keys
          .map((cacheKey) =>
            options.cacheByKey?.[cacheKey]
              ? { cacheKey, ...options.cacheByKey[cacheKey] }
              : null,
          )
          .filter(Boolean),
      ),
    ),
  };
  const configService = { get: jest.fn().mockReturnValue('https://cdn.test') };
  // Active org by default so content still resolves; a soft-deleted org would
  // return null here and yield an empty snapshot.
  const organizationsRepository = {
    findById: jest.fn().mockResolvedValue({ _id: 'org' }),
  };

  return new PlayerContentService(
    screensRepository as never,
    playlistsRepository as never,
    mediaRepository as never,
    appInstancesRepository as never,
    appDataCacheRepository as never,
    organizationsRepository as never,
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
      screenItems: [screenMediaItem(withThumb, 0), screenMediaItem(noThumb, 1)],
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

  it('expands an app item inside a playlist to an app renderable', async () => {
    const inPlaylist = media({ id: 'inPlaylist' });
    const appInstanceId = new Types.ObjectId();

    const service = buildService({
      mediaById: { [inPlaylist._id.toString()]: inPlaylist },
      appsById: {
        [appInstanceId.toString()]: {
          _id: appInstanceId,
          appSlug: 'clock',
          config: { format: '24h' },
          updatedAt: new Date('2024-03-01T00:00:00Z'),
        },
      },
      screenItems: [
        {
          _id: new Types.ObjectId(),
          type: ScreenItemType.PLAYLIST,
          playlistId: new Types.ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
          order: 0,
          disabled: false,
        },
      ],
      playlists: {
        aaaaaaaaaaaaaaaaaaaaaaaa: [
          // Legacy media item (no explicit `type`) — defaults to media.
          {
            _id: new Types.ObjectId(),
            mediaId: inPlaylist._id,
            order: 0,
            duration: 4,
            disabled: false,
          },
          {
            _id: new Types.ObjectId(),
            type: PlaylistItemType.APP,
            appInstanceId,
            order: 1,
            duration: 12,
            disabled: false,
          },
        ],
      },
    });

    const snapshot = await service.resolveByScreenId('org', 'screen');

    expect(snapshot?.items).toHaveLength(2);
    expect(snapshot?.items[0]).toMatchObject({
      kind: 'image',
      durationMs: 4_000,
    });
    expect(snapshot?.items[1]).toMatchObject({
      kind: 'app',
      slug: 'clock',
      config: { format: '24h' },
      durationMs: 12_000,
    });
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
    // `static` apps (no connector) carry no `data` field.
    expect(snapshot?.items[0]).not.toHaveProperty('data');
  });

  it('populates a server app renderable with its cached connector payload', async () => {
    const appInstanceId = new Types.ObjectId();
    const payload = { location: 'Belgrade', temperatureC: 21 };
    const service = buildService({
      mediaById: {},
      appsById: {
        [appInstanceId.toString()]: {
          _id: appInstanceId,
          appSlug: 'weather',
          config: { location: 'Belgrade', units: 'metric' },
          updatedAt: new Date('2024-03-01T00:00:00Z'),
        },
      },
      // weatherConnector.cacheKey({ location: 'Belgrade' }) === 'weather:belgrade'
      cacheByKey: {
        'weather:belgrade': {
          payload,
          fetchedAt: new Date('2024-03-01T12:00:00Z'),
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

    expect(snapshot?.items[0]).toMatchObject({
      kind: 'app',
      slug: 'weather',
      data: payload,
      // Freshness meta lets the bundle show an "as of …" age; fresh → not stale.
      dataMeta: { fetchedAt: '2024-03-01T12:00:00.000Z', stale: false },
    });
  });

  it('flags a server app payload as stale when the last fetch errored', async () => {
    const appInstanceId = new Types.ObjectId();
    const payload = { location: 'Belgrade', temperatureC: 21 };
    const service = buildService({
      mediaById: {},
      appsById: {
        [appInstanceId.toString()]: {
          _id: appInstanceId,
          appSlug: 'weather',
          config: { location: 'Belgrade' },
          updatedAt: new Date('2024-03-01T00:00:00Z'),
        },
      },
      cacheByKey: {
        'weather:belgrade': {
          payload,
          // Last good fetch stands; a later attempt failed → serve it as stale.
          fetchedAt: new Date('2024-03-01T12:00:00Z'),
          lastError: 'upstream 500',
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
    expect(snapshot?.items[0]).toMatchObject({
      data: payload,
      dataMeta: { fetchedAt: '2024-03-01T12:00:00.000Z', stale: true },
    });
  });

  it('server app data is null before the first fetch', async () => {
    const appInstanceId = new Types.ObjectId();
    const service = buildService({
      mediaById: {},
      appsById: {
        [appInstanceId.toString()]: {
          _id: appInstanceId,
          appSlug: 'weather',
          config: { location: 'Belgrade' },
          updatedAt: new Date('2024-03-01T00:00:00Z'),
        },
      },
      // No cache entry yet.
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
    expect(snapshot?.items[0]).toMatchObject({
      kind: 'app',
      slug: 'weather',
      data: null,
    });
  });

  it('changes revision when a server app payload refreshes', async () => {
    const appInstanceId = new Types.ObjectId();
    const build = (fetchedAt: Date, payload: unknown) =>
      buildService({
        mediaById: {},
        appsById: {
          [appInstanceId.toString()]: {
            _id: appInstanceId,
            appSlug: 'weather',
            config: { location: 'Belgrade' },
            updatedAt: new Date('2024-03-01T00:00:00Z'),
          },
        },
        cacheByKey: { 'weather:belgrade': { payload, fetchedAt } },
        screenItems: [
          {
            _id: new Types.ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb'),
            type: ScreenItemType.APP,
            appInstanceId,
            order: 0,
            duration: 30,
            disabled: false,
          },
        ],
      });

    const first = await build(new Date('2024-03-01T12:00:00Z'), {
      t: 21,
    }).resolveByScreenId('org', 'screen');
    const refreshed = await build(new Date('2024-03-01T12:15:00Z'), {
      t: 22,
    }).resolveByScreenId('org', 'screen');

    expect(first?.revision).not.toBe(refreshed?.revision);
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

  describe('availability', () => {
    const ALL_DAYS = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];

    /** Stored subdocument shape: both blocks always present (CMS bookkeeping). */
    const storedAvailability = (mode: 'always' | 'weekly' | 'special') => ({
      mode,
      timezone: 'Europe/Belgrade',
      weekly: ALL_DAYS.map((day) => ({
        day,
        enabled: day === 'monday',
        start: '09:00',
        end: '17:00',
      })),
      special: {
        startDate: '2026-06-10',
        endDate: '2026-06-12',
        start: '09:00',
        end: '17:00',
      },
    });

    it('maps a weekly availability to enabled days only, without the special block', async () => {
      const service = buildService({
        mediaById: {},
        screenItems: [],
        availability: storedAvailability('weekly'),
      });

      const snapshot = await service.resolveByScreenId('org', 'screen');

      // Only the enabled day is sent — disabled days carry placeholder hours
      // that would needlessly churn the revision.
      expect(snapshot?.availability).toEqual({
        mode: 'weekly',
        timezone: 'Europe/Belgrade',
        weekly: [{ day: 'monday', enabled: true, start: '09:00', end: '17:00' }],
      });
      expect(snapshot?.availability).not.toHaveProperty('special');
    });

    it('does not churn the revision when only a disabled weekly day changes', async () => {
      const base = storedAvailability('weekly');
      const editedDisabledDay = {
        ...base,
        weekly: base.weekly.map((day: { day: string }) =>
          day.day === 'sunday'
            ? { ...day, start: '01:00', end: '05:00' } // cosmetic: Sunday stays disabled
            : day,
        ),
      };

      const first = await buildService({
        mediaById: {},
        screenItems: [],
        availability: base,
      }).resolveByScreenId('org', 'screen');
      const second = await buildService({
        mediaById: {},
        screenItems: [],
        availability: editedDisabledDay,
      }).resolveByScreenId('org', 'screen');

      expect(first?.revision).toBe(second?.revision);
    });

    it('fails open to always-on when a special-mode doc is missing its block', async () => {
      const broken = { mode: 'special', timezone: 'Europe/Belgrade', weekly: [] };
      const service = buildService({
        mediaById: {},
        screenItems: [],
        availability: broken,
      });

      const snapshot = await service.resolveByScreenId('org', 'screen');

      expect(snapshot?.availability).toEqual({
        mode: 'always',
        timezone: 'Europe/Belgrade',
      });
    });

    it('keeps the availability rule on the org-pending-deletion snapshot', async () => {
      const service = buildService({
        mediaById: {},
        screenItems: [],
        availability: storedAvailability('weekly'),
      });
      // Soft-deleted org: findById(org) returns null → empty snapshot.
      (
        service as unknown as {
          organizationsRepository: { findById: jest.Mock };
        }
      ).organizationsRepository.findById = jest.fn().mockResolvedValue(null);

      const snapshot = await service.resolveByScreenId('org', 'screen');

      expect(snapshot?.revision).toBe('org-pending-deletion');
      expect(snapshot?.items).toEqual([]);
      expect(snapshot?.availability).toEqual({
        mode: 'weekly',
        timezone: 'Europe/Belgrade',
        weekly: [{ day: 'monday', enabled: true, start: '09:00', end: '17:00' }],
      });
    });

    it('maps a special availability into the snapshot without the weekly block', async () => {
      const service = buildService({
        mediaById: {},
        screenItems: [],
        availability: storedAvailability('special'),
      });

      const snapshot = await service.resolveByScreenId('org', 'screen');

      expect(snapshot?.availability).toEqual({
        mode: 'special',
        timezone: 'Europe/Belgrade',
        special: {
          startDate: '2026-06-10',
          endDate: '2026-06-12',
          start: '09:00',
          end: '17:00',
        },
      });
      expect(snapshot?.availability).not.toHaveProperty('weekly');
    });

    it('maps an explicit always mode to a bare always rule', async () => {
      const service = buildService({
        mediaById: {},
        screenItems: [],
        availability: storedAvailability('always'),
      });

      const snapshot = await service.resolveByScreenId('org', 'screen');

      expect(snapshot?.availability).toEqual({
        mode: 'always',
        timezone: 'Europe/Belgrade',
      });
    });

    it('omits availability when the screen has none (legacy always-on)', async () => {
      const service = buildService({ mediaById: {}, screenItems: [] });

      const snapshot = await service.resolveByScreenId('org', 'screen');

      expect(snapshot).not.toBeNull();
      expect(snapshot).not.toHaveProperty('availability');
    });

    it('changes the revision when only availability changes, stable otherwise', async () => {
      const build = (availability?: unknown) =>
        buildService({ mediaById: {}, screenItems: [], availability });

      const first = await build(storedAvailability('weekly')).resolveByScreenId(
        'org',
        'screen',
      );
      const same = await build(storedAvailability('weekly')).resolveByScreenId(
        'org',
        'screen',
      );
      const special = await build(
        storedAvailability('special'),
      ).resolveByScreenId('org', 'screen');
      const none = await build(undefined).resolveByScreenId('org', 'screen');

      expect(first?.revision).toBe(same?.revision);
      expect(first?.revision).not.toBe(special?.revision);
      expect(first?.revision).not.toBe(none?.revision);
    });
  });
});
