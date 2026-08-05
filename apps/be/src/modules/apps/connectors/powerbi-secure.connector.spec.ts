import type {
  ConnectorContext,
  PrivateAssetRef,
  ResolvedConnection,
} from '@signagewall/apps-contract';

import { PowerBiApiError } from '../../connections/providers/powerbi-api';
import {
  cleanupPowerBiSecureState,
  createPowerBiSecureConnector,
} from './powerbi-secure.connector';
import type { PowerBiExportApi } from './powerbi-secure/powerbi-export-api';
import type { PowerBiPrivateStorage } from './powerbi-secure/storage.registry';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
const REPORT_ID = '22222222-2222-4222-8222-222222222222';
const EXPORT_ID = 'Mi9C5419i....PS4=';
const FIXED_NOW = new Date('2026-08-05T12:00:00.000Z');
const PNG = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  Buffer.from('safe-test-page'),
]);

const connection: ResolvedConnection = {
  id: 'connection-1',
  organizationId: 'organization-1',
  appInstanceId: 'instance-1',
  provider: 'microsoft',
  accountLabel: 'BI operator',
  accessToken: 'SECRET_ACCESS_TOKEN',
  refreshToken: 'SECRET_REFRESH_TOKEN',
  scopes: [],
};

const config = {
  connectionId: connection.id,
  workspace: { id: WORKSPACE_ID, label: 'Factory' },
  report: { id: REPORT_ID, label: 'Shift report' },
  refreshMinutes: 15,
  slideDuration: 12,
  fit: 'contain' as const,
  background: '#000000',
};

function apiMock(
  overrides: Partial<jest.Mocked<PowerBiExportApi>> = {},
): jest.Mocked<PowerBiExportApi> {
  return {
    start: jest.fn().mockResolvedValue({ id: EXPORT_ID, status: 'running' }),
    poll: jest.fn().mockResolvedValue({ id: EXPORT_ID, status: 'running' }),
    download: jest.fn().mockResolvedValue(PNG),
    ...overrides,
  };
}

function ref(version: string, index = 1): PrivateAssetRef {
  return {
    kind: 'private-asset',
    key: `private-assets/v1/organizations/organization-1/instances/instance-1/connections/connection-1/versions/${version}/page-${index}.png`,
    version,
    mimeType: 'image/png',
  };
}

function storageMock(): jest.Mocked<PowerBiPrivateStorage> {
  return {
    isConfigured: jest.fn().mockReturnValue(true),
    uploadAsset: jest
      .fn()
      .mockImplementation(
        async (input: Parameters<PowerBiPrivateStorage['uploadAsset']>[0]) =>
          ref(input.version, Number(/(\d+)/.exec(input.filename)?.[1] ?? 1)),
      ),
    deleteReplacedAssets: jest.fn().mockResolvedValue(undefined),
    deleteAssetSet: jest.fn().mockResolvedValue(undefined),
  };
}

function context(secrets?: Record<string, unknown>): ConnectorContext {
  return {
    connection,
    ...(secrets ? { secrets } : {}),
    logger: {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  };
}

function jobSecrets(startedAt = FIXED_NOW.toISOString()) {
  return {
    powerBiSecure: {
      job: {
        id: EXPORT_ID,
        workspaceId: WORKSPACE_ID,
        reportId: REPORT_ID,
        startedAt,
      },
    },
  };
}

function renderedSecrets(version = 'old-version') {
  return {
    powerBiSecure: {
      job: {
        id: EXPORT_ID,
        workspaceId: WORKSPACE_ID,
        reportId: REPORT_ID,
        startedAt: FIXED_NOW.toISOString(),
      },
      rendered: {
        version,
        reportName: 'Previous report',
        exportedAt: '2026-08-04T12:00:00.000Z',
        pages: [ref(version)],
      },
    },
  };
}

describe('powerbiSecureConnector', () => {
  it('declares only the delegated read scopes needed by snapshot export', () => {
    const connector = createPowerBiSecureConnector();
    expect(connector.oauth).toEqual({
      provider: 'microsoft',
      authorizationUrl:
        'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      scopes: [
        'https://analysis.windows.net/powerbi/api/Workspace.Read.All',
        'https://analysis.windows.net/powerbi/api/Report.Read.All',
        'https://analysis.windows.net/powerbi/api/Dataset.Read.All',
      ],
    });
  });

  it('builds a deterministic, selection-isolated cache key', () => {
    const connector = createPowerBiSecureConnector();
    const first = connector.cacheKey?.(config);
    expect(first).toBe(
      `powerbi-secure:png-v1:${connection.id}:${WORKSPACE_ID}:${REPORT_ID}:all-pages`,
    );
    expect(connector.cacheKey?.({ ...config, slideDuration: 99 })).toBe(first);
    expect(
      connector.cacheKey?.({
        ...config,
        page: { id: 'ReportSectionA', label: 'Overview' },
      }),
    ).not.toBe(first);
    expect(connector.cacheKey?.({ ...config, report: undefined })).toBe('');
  });

  it('honors the configured export cadence within safe bounds', () => {
    const connector = createPowerBiSecureConnector();
    expect(connector.refreshSeconds?.(config)).toBe(15 * 60);
    expect(connector.refreshSeconds?.({ ...config, refreshMinutes: 60 })).toBe(
      60 * 60,
    );
    expect(connector.refreshSeconds?.({ ...config, refreshMinutes: 1 })).toBe(
      5 * 60,
    );
    expect(
      connector.refreshSeconds?.({ ...config, refreshMinutes: 9999 }),
    ).toBe(1440 * 60);
    expect(
      connector.refreshSeconds?.({ ...config, refreshMinutes: Number.NaN }),
    ).toBe(15 * 60);
  });

  it('starts one export and persists token-free pending state', async () => {
    const api = apiMock();
    const storage = storageMock();
    const connector = createPowerBiSecureConnector({
      api,
      storage,
      now: () => FIXED_NOW,
    });

    const result = await connector.fetchData(config, context());

    expect(result.pending).toBe(true);
    expect(result.playerPayload).toBeUndefined();
    expect(api.start).toHaveBeenCalledWith({
      accessToken: connection.accessToken,
      workspaceId: WORKSPACE_ID,
      reportId: REPORT_ID,
    });
    expect(api.poll).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain(connection.accessToken);
    expect(JSON.stringify(result)).not.toContain(connection.refreshToken);
    expect(result.secrets).toMatchObject({
      powerBiSecure: {
        job: { id: EXPORT_ID, startedAt: FIXED_NOW.toISOString() },
      },
    });
  });

  it('resumes the persisted job after a process restart', async () => {
    const api = apiMock();
    const connector = createPowerBiSecureConnector({
      api,
      storage: storageMock(),
      now: () => FIXED_NOW,
    });

    const result = await connector.fetchData(config, context(jobSecrets()));

    expect(result.pending).toBe(true);
    expect(api.start).not.toHaveBeenCalled();
    expect(api.poll).toHaveBeenCalledWith({
      accessToken: connection.accessToken,
      workspaceId: WORKSPACE_ID,
      reportId: REPORT_ID,
      exportId: EXPORT_ID,
    });
  });

  it('downloads a succeeded export and uploads private refs with connection-derived ownership', async () => {
    const api = apiMock({
      poll: jest.fn().mockResolvedValue({ id: EXPORT_ID, status: 'succeeded' }),
    });
    const storage = storageMock();
    const connector = createPowerBiSecureConnector({
      api,
      storage,
      now: () => FIXED_NOW,
    });

    const result = await connector.fetchData(config, context(jobSecrets()));

    expect(result.pending).toBeUndefined();
    expect(result.playerPayload).toMatchObject({
      reportName: 'Shift report',
      exportedAt: FIXED_NOW.toISOString(),
      pages: [{ kind: 'private-asset', mimeType: 'image/png' }],
    });
    expect(storage.uploadAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: {
          organizationId: connection.organizationId,
          appInstanceId: connection.appInstanceId,
          connectionId: connection.id,
        },
        filename: 'page-001.png',
        body: PNG,
        mimeType: 'image/png',
      }),
    );
    expect(JSON.stringify(result)).not.toContain('X-Amz-');
    expect(JSON.stringify(result)).not.toContain(connection.accessToken);
  });

  it('preserves last-known-good pages and records an actionable failed-job state', async () => {
    const api = apiMock({
      poll: jest.fn().mockResolvedValue({ id: EXPORT_ID, status: 'failed' }),
    });
    const previous = renderedSecrets();
    const connector = createPowerBiSecureConnector({
      api,
      storage: storageMock(),
      now: () => FIXED_NOW,
    });

    const result = await connector.fetchData(config, context(previous));

    expect(result).toMatchObject({
      pending: true,
      error:
        'Power BI could not export this report. Verify capacity, tenant export settings, report permissions, and unsupported visuals or sensitivity labels.',
      secrets: {
        powerBiSecure: {
          rendered: (previous.powerBiSecure as Record<string, unknown>)
            .rendered,
          lastError: { code: 'EXPORT_FAILED', at: FIXED_NOW.toISOString() },
        },
      },
    });
    expect(result.playerPayload).toBeUndefined();
    expect(
      (result.secrets?.powerBiSecure as Record<string, unknown>).job,
    ).toBeUndefined();
  });

  it('expires a stuck job without polling and keeps the last-known-good state', async () => {
    const api = apiMock();
    const old = renderedSecrets();
    (old.powerBiSecure.job as Record<string, unknown>).startedAt =
      '2026-08-05T11:20:00.000Z';
    const connector = createPowerBiSecureConnector({
      api,
      storage: storageMock(),
      now: () => FIXED_NOW,
    });

    const result = await connector.fetchData(config, context(old));

    expect(api.poll).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      pending: true,
      error: 'Power BI export timed out. A new snapshot will be requested.',
      secrets: {
        powerBiSecure: {
          lastError: { code: 'EXPORT_TIMEOUT' },
          rendered: old.powerBiSecure.rendered,
        },
      },
    });
  });

  it('persists the job and retry window on throttling without leaking the token', async () => {
    const api = apiMock({
      poll: jest
        .fn()
        .mockRejectedValue(
          new PowerBiApiError(
            'THROTTLED',
            'Power BI is throttling snapshot export. Try again in 30 seconds.',
            429,
            30,
          ),
        ),
    });
    const connector = createPowerBiSecureConnector({
      api,
      storage: storageMock(),
      now: () => FIXED_NOW,
    });

    const result = await connector.fetchData(
      config,
      context(renderedSecrets()),
    );

    expect(result).toMatchObject({
      pending: true,
      error: 'Power BI is throttling snapshot export. Try again in 30 seconds.',
      secrets: {
        powerBiSecure: {
          job: { id: EXPORT_ID },
          lastError: {
            code: 'THROTTLED',
            retryAt: '2026-08-05T12:00:30.000Z',
          },
        },
      },
    });
    expect(JSON.stringify(result)).not.toContain(connection.accessToken);
    expect(JSON.stringify(result)).not.toContain('SECRET_REFRESH_TOKEN');
  });

  it('does not hit Power BI again before a persisted retry window expires', async () => {
    const api = apiMock();
    const state = renderedSecrets();
    state.powerBiSecure.lastError = {
      code: 'THROTTLED',
      message: 'Try later',
      at: FIXED_NOW.toISOString(),
      retryAt: '2026-08-05T12:01:00.000Z',
    };
    const connector = createPowerBiSecureConnector({
      api,
      storage: storageMock(),
      now: () => FIXED_NOW,
    });

    const result = await connector.fetchData(config, context(state));

    expect(result.pending).toBe(true);
    expect(result.error).toBe('Try later');
    expect(api.poll).not.toHaveBeenCalled();
    expect(api.start).not.toHaveBeenCalled();
  });

  it('reuses stable private refs when exported bytes are unchanged', async () => {
    const api = apiMock({
      poll: jest.fn().mockResolvedValue({ id: EXPORT_ID, status: 'succeeded' }),
    });
    const storage = storageMock();
    const firstConnector = createPowerBiSecureConnector({
      api,
      storage,
      now: () => FIXED_NOW,
    });
    const first = await firstConnector.fetchData(config, context(jobSecrets()));
    const version = first.version!;
    const previous = {
      powerBiSecure: {
        job: jobSecrets().powerBiSecure.job,
        rendered: {
          version,
          reportName: 'Old label',
          exportedAt: FIXED_NOW.toISOString(),
          pages: [ref(version)],
        },
      },
    };
    storage.uploadAsset.mockClear();

    const second = await firstConnector.fetchData(config, context(previous));

    expect(second.version).toBe(version);
    expect(second.playerPayload?.pages).toEqual([ref(version)]);
    expect(second.playerPayload?.reportName).toBe('Shift report');
    expect(storage.uploadAsset).not.toHaveBeenCalled();
  });

  it('deletes replaced objects after a successful replacement', async () => {
    const api = apiMock({
      poll: jest.fn().mockResolvedValue({ id: EXPORT_ID, status: 'succeeded' }),
    });
    const storage = storageMock();
    const connector = createPowerBiSecureConnector({
      api,
      storage,
      now: () => FIXED_NOW,
    });

    const result = await connector.fetchData(
      config,
      context(renderedSecrets()),
    );

    expect(storage.deleteReplacedAssets).toHaveBeenCalledWith(
      {
        organizationId: connection.organizationId,
        appInstanceId: connection.appInstanceId,
        connectionId: connection.id,
      },
      [ref('old-version')],
      result.playerPayload?.pages,
    );
  });

  it('best-effort deletes partially uploaded assets when upload fails', async () => {
    const zip = makeStoredZip([
      { name: 'one.png', body: PNG },
      { name: 'two.png', body: Buffer.concat([PNG, Buffer.from('two')]) },
    ]);
    const api = apiMock({
      poll: jest.fn().mockResolvedValue({ id: EXPORT_ID, status: 'succeeded' }),
      download: jest.fn().mockResolvedValue(zip),
    });
    const storage = storageMock();
    storage.uploadAsset
      .mockResolvedValueOnce(ref('partial'))
      .mockRejectedValueOnce(new Error('private upload unavailable'));
    const connector = createPowerBiSecureConnector({
      api,
      storage,
      now: () => FIXED_NOW,
    });

    const result = await connector.fetchData(
      config,
      context(renderedSecrets()),
    );
    expect(result).toMatchObject({
      pending: true,
      error:
        'Secure snapshot storage is temporarily unavailable. The last successful snapshot remains on screen.',
      secrets: {
        powerBiSecure: {
          rendered: renderedSecrets().powerBiSecure.rendered,
          lastError: { code: 'STORAGE_UNAVAILABLE' },
        },
      },
    });
    expect(storage.deleteAssetSet).toHaveBeenCalledWith(
      expect.objectContaining({ connectionId: connection.id }),
      [ref('partial')],
    );
  });

  it('exposes deterministic teardown cleanup for persisted rendered refs', async () => {
    const storage = storageMock();

    await cleanupPowerBiSecureState(connection, renderedSecrets(), storage);

    expect(storage.deleteAssetSet).toHaveBeenCalledWith(
      {
        organizationId: connection.organizationId,
        appInstanceId: connection.appInstanceId,
        connectionId: connection.id,
      },
      [ref('old-version')],
    );
  });

  it('rejects a ZIP path traversal before uploading anything', async () => {
    const api = apiMock({
      poll: jest.fn().mockResolvedValue({ id: EXPORT_ID, status: 'succeeded' }),
      download: jest
        .fn()
        .mockResolvedValue(
          makeStoredZip([{ name: '../stolen.png', body: PNG }]),
        ),
    });
    const storage = storageMock();
    const connector = createPowerBiSecureConnector({
      api,
      storage,
      now: () => FIXED_NOW,
    });

    await expect(
      connector.fetchData(config, context(renderedSecrets())),
    ).resolves.toMatchObject({
      pending: true,
      error:
        'Power BI returned an export that could not be safely processed. The last successful snapshot remains on screen.',
      secrets: {
        powerBiSecure: {
          rendered: renderedSecrets().powerBiSecure.rendered,
          lastError: { code: 'UNSAFE_EXPORT' },
        },
      },
    });
    expect(storage.uploadAsset).not.toHaveBeenCalled();
  });

  it('rejects excessive page count before uploading anything', async () => {
    const api = apiMock({
      poll: jest.fn().mockResolvedValue({ id: EXPORT_ID, status: 'succeeded' }),
      download: jest.fn().mockResolvedValue(
        makeStoredZip(
          Array.from({ length: 51 }, (_, index) => ({
            name: `page-${index}.png`,
            body: PNG,
          })),
        ),
      ),
    });
    const storage = storageMock();
    const connector = createPowerBiSecureConnector({
      api,
      storage,
      now: () => FIXED_NOW,
    });

    await expect(
      connector.fetchData(config, context(renderedSecrets())),
    ).resolves.toMatchObject({
      pending: true,
      secrets: {
        powerBiSecure: {
          rendered: renderedSecrets().powerBiSecure.rendered,
          lastError: { code: 'UNSAFE_EXPORT' },
        },
      },
    });
    expect(storage.uploadAsset).not.toHaveBeenCalled();
  });

  it('rejects a ZIP bomb by declared uncompressed size before inflation', async () => {
    const zip = makeStoredZip([{ name: 'page.png', body: PNG }]);
    const centralOffset = zip.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    zip.writeUInt32LE(25 * 1024 * 1024 + 1, centralOffset + 24);
    const api = apiMock({
      poll: jest.fn().mockResolvedValue({ id: EXPORT_ID, status: 'succeeded' }),
      download: jest.fn().mockResolvedValue(zip),
    });
    const storage = storageMock();
    const connector = createPowerBiSecureConnector({
      api,
      storage,
      now: () => FIXED_NOW,
    });

    await expect(
      connector.fetchData(config, context(renderedSecrets())),
    ).resolves.toMatchObject({
      pending: true,
      secrets: {
        powerBiSecure: {
          rendered: renderedSecrets().powerBiSecure.rendered,
          lastError: { code: 'UNSAFE_EXPORT' },
        },
      },
    });
    expect(storage.uploadAsset).not.toHaveBeenCalled();
  });

  it('rejects missing connection ownership rather than trusting config fields', async () => {
    const connector = createPowerBiSecureConnector({
      api: apiMock(),
      storage: storageMock(),
      now: () => FIXED_NOW,
    });
    const unsafeConnection = { ...connection, organizationId: '' };

    await expect(
      connector.fetchData(config, {
        ...context(),
        connection: unsafeConnection,
      }),
    ).rejects.toThrow('connection ownership is incomplete');
  });
});

/** Minimal stored ZIP builder for parser/state integration tests. */
function makeStoredZip(files: Array<{ name: string; body: Buffer }>): Buffer {
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let localOffset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name);
    const compressed = file.body;
    const crc = crc32(file.body);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(file.body.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, compressed);

    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50, 0);
    directory.writeUInt16LE(20, 4);
    directory.writeUInt16LE(20, 6);
    directory.writeUInt16LE(0x800, 8);
    directory.writeUInt16LE(0, 10);
    directory.writeUInt32LE(crc, 16);
    directory.writeUInt32LE(compressed.length, 20);
    directory.writeUInt32LE(file.body.length, 24);
    directory.writeUInt16LE(name.length, 28);
    directory.writeUInt32LE(localOffset, 42);
    central.push(directory, name);
    localOffset += local.length + name.length + compressed.length;
  }
  const localBytes = Buffer.concat(locals);
  const centralBytes = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBytes.length, 12);
  end.writeUInt32LE(localBytes.length, 16);
  return Buffer.concat([localBytes, centralBytes, end]);
}

function crc32(body: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of body) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
