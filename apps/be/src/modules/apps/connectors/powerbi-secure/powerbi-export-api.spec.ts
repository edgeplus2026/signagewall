import { PowerBiApiError } from '../../../connections/providers/powerbi-api';
import { powerBiExportApi } from './powerbi-export-api';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
const REPORT_ID = '22222222-2222-4222-8222-222222222222';
const EXPORT_ID = 'Mi9C5419i....PS4=';
const TOKEN = 'TOP_SECRET_BEARER';

function response(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(Buffer.isBuffer(body) ? body : JSON.stringify(body), {
    status,
    headers: {
      ...(Buffer.isBuffer(body)
        ? { 'content-type': 'application/octet-stream' }
        : { 'content-type': 'application/json' }),
      ...headers,
    },
  });
}

describe('powerBiExportApi', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('starts PNG export at the official ExportTo endpoint with an optional page', async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValue(
        response({ id: EXPORT_ID, status: 'Running', percentComplete: 0 }, 202),
      );
    global.fetch = mockFetch;

    const result = await powerBiExportApi.start({
      accessToken: TOKEN,
      workspaceId: WORKSPACE_ID,
      reportId: REPORT_ID,
      pageName: 'ReportSection123',
    });

    expect(result).toEqual({
      id: EXPORT_ID,
      status: 'running',
      percentComplete: 0,
    });
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.powerbi.com/v1.0/myorg/groups/${WORKSPACE_ID}/reports/${REPORT_ID}/ExportTo`,
      expect.objectContaining({
        method: 'POST',
        redirect: 'error',
        headers: expect.objectContaining({ authorization: `Bearer ${TOKEN}` }),
        body: JSON.stringify({
          format: 'PNG',
          powerBIReportConfiguration: {
            pages: [{ pageName: 'ReportSection123' }],
          },
        }),
      }),
    );
  });

  it('polls the official exports endpoint and safely encodes an opaque export id', async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValue(
        response({ id: EXPORT_ID, status: 'Succeeded', percentComplete: 100 }),
      );
    global.fetch = mockFetch;

    await expect(
      powerBiExportApi.poll({
        accessToken: TOKEN,
        workspaceId: WORKSPACE_ID,
        reportId: REPORT_ID,
        exportId: EXPORT_ID,
      }),
    ).resolves.toMatchObject({ id: EXPORT_ID, status: 'succeeded' });

    expect(mockFetch.mock.calls[0][0]).toBe(
      `https://api.powerbi.com/v1.0/myorg/groups/${WORKSPACE_ID}/reports/${REPORT_ID}/exports/Mi9C5419i....PS4%3D`,
    );
  });

  it('rejects an unsafe export id returned by Power BI before it can be cached', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        response({ id: '../foreign-job', status: 'Running' }, 202),
      );

    await expect(
      powerBiExportApi.start({
        accessToken: TOKEN,
        workspaceId: WORKSPACE_ID,
        reportId: REPORT_ID,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_IDENTIFIER' });
  });

  it('downloads only from the fixed export-file endpoint and enforces the byte limit', async () => {
    const body = Buffer.from('export-bytes');
    const mockFetch = jest
      .fn()
      .mockResolvedValue(
        response(body, 200, { 'content-length': String(body.length) }),
      );
    global.fetch = mockFetch;

    await expect(
      powerBiExportApi.download({
        accessToken: TOKEN,
        workspaceId: WORKSPACE_ID,
        reportId: REPORT_ID,
        exportId: EXPORT_ID,
        maxBytes: body.length,
      }),
    ).resolves.toEqual(body);
    expect(mockFetch.mock.calls[0][0]).toBe(
      `https://api.powerbi.com/v1.0/myorg/groups/${WORKSPACE_ID}/reports/${REPORT_ID}/exports/Mi9C5419i....PS4%3D/file`,
    );

    global.fetch = jest
      .fn()
      .mockResolvedValue(response(body, 200, { 'content-length': '9999' }));
    await expect(
      powerBiExportApi.download({
        accessToken: TOKEN,
        workspaceId: WORKSPACE_ID,
        reportId: REPORT_ID,
        exportId: EXPORT_ID,
        maxBytes: 20,
      }),
    ).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE' });
  });

  it('stops a chunked export as soon as the streaming byte cap is exceeded', async () => {
    const cancelled = jest.fn();
    let readCount = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        readCount += 1;
        controller.enqueue(new Uint8Array(8));
      },
      cancel: cancelled,
    });
    global.fetch = jest.fn().mockResolvedValue(new Response(body));

    await expect(
      powerBiExportApi.download({
        accessToken: TOKEN,
        workspaceId: WORKSPACE_ID,
        reportId: REPORT_ID,
        exportId: EXPORT_ID,
        maxBytes: 15,
      }),
    ).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE' });

    // The Web Streams implementation may pre-pull one chunk, but the reader
    // must cancel immediately after observing the over-limit second chunk.
    expect(readCount).toBeLessThanOrEqual(3);
    expect(cancelled).toHaveBeenCalledTimes(1);
  });

  it.each(['../victim', 'id/other', 'id?next=x', 'id#fragment', 'id\\other'])(
    'rejects export-id path injection: %s',
    async (exportId) => {
      global.fetch = jest.fn();
      await expect(
        powerBiExportApi.poll({
          accessToken: TOKEN,
          workspaceId: WORKSPACE_ID,
          reportId: REPORT_ID,
          exportId,
        }),
      ).rejects.toMatchObject({ code: 'INVALID_IDENTIFIER' });
      expect(global.fetch).not.toHaveBeenCalled();
    },
  );

  it('surfaces throttling without leaking bearer token or response details', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        response(
          { error: { code: 'Hidden', message: `never expose ${TOKEN}` } },
          429,
          { 'retry-after': '30' },
        ),
      );

    let caught: unknown;
    try {
      await powerBiExportApi.poll({
        accessToken: TOKEN,
        workspaceId: WORKSPACE_ID,
        reportId: REPORT_ID,
        exportId: EXPORT_ID,
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PowerBiApiError);
    expect(caught).toMatchObject({
      code: 'THROTTLED',
      status: 429,
      retryAfterSeconds: 30,
    });
    expect(String(caught)).not.toContain(TOKEN);
    expect(String(caught)).not.toContain('Hidden');
  });

  it('classifies the documented capacity prerequisite without exposing body text', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      response(
        {
          error: {
            code: 'InvalidRequest',
            message: 'Report is not assigned to dedicated capacity INTERNAL',
          },
        },
        400,
      ),
    );

    let caught: unknown;
    try {
      await powerBiExportApi.start({
        accessToken: TOKEN,
        workspaceId: WORKSPACE_ID,
        reportId: REPORT_ID,
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({ code: 'CAPACITY_REQUIRED', status: 400 });
    expect(String(caught)).not.toContain('INTERNAL');
  });
});
