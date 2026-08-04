import { Types } from 'mongoose';

import { AnalyticsService } from './analytics.service';
import { FunnelEventName } from './schemas/funnel-event.schema';

function acquisitionToken() {
  return Buffer.from(
    JSON.stringify({
      version: 1,
      anonymousId: 'anon-123',
      firstTouch: {
        source: 'google',
        medium: 'cpc',
        campaign: 'launch',
        landingPath: '/en?utm_source=google',
        occurredAt: '2026-08-01T10:00:00.000Z',
      },
      lastTouch: { source: 'newsletter', medium: 'email' },
      analyticsConsent: true,
    }),
  ).toString('base64url');
}

function build() {
  const repository = {
    findLatestForIdentity: jest.fn().mockResolvedValue(null),
    create: jest.fn(async (value: Record<string, unknown>) => ({
      _id: new Types.ObjectId(),
      ...value,
    })),
    overview: jest.fn().mockResolvedValue({
      counts: [
        { _id: FunnelEventName.MARKETING_LANDING, count: 100 },
        { _id: FunnelEventName.MARKETING_CTA_CLICKED, count: 25 },
      ],
      acquisitions: [],
      recent: [],
    }),
  };
  const ga4 = { send: jest.fn().mockResolvedValue(undefined) };
  const service = new AnalyticsService(repository as never, ga4 as never);
  return { service, repository, ga4 };
}

describe('AnalyticsService', () => {
  it('persists sanitized first/last-touch attribution without PII properties', async () => {
    const { service, repository } = build();

    await service.record({
      eventName: FunnelEventName.SIGN_UP,
      userId: new Types.ObjectId().toString(),
      acquisitionToken: acquisitionToken(),
      dedupeKey: 'sign-up:test',
      properties: {
        authProvider: 'local',
        email: 'must-not-be-stored@example.com',
        name: 'Must Not Be Stored',
      },
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        anonymousId: 'anon-123',
        analyticsConsent: true,
        firstTouch: expect.objectContaining({
          source: 'google',
          medium: 'cpc',
        }),
        lastTouch: expect.objectContaining({ source: 'newsletter' }),
        properties: { authProvider: 'local' },
      }),
    );
  });

  it('inherits attribution for later server-side lifecycle events', async () => {
    const { service, repository } = build();
    repository.findLatestForIdentity.mockResolvedValue({
      firstTouch: { source: 'partner', medium: 'referral' },
      lastTouch: { source: 'partner', medium: 'referral' },
    });

    await service.record({
      eventName: FunnelEventName.FIRST_SCREEN_ACTIVATED,
      userId: new Types.ObjectId().toString(),
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        firstTouch: expect.objectContaining({ source: 'partner' }),
        lastTouch: expect.objectContaining({ source: 'partner' }),
      }),
    );
  });

  it('calculates founder funnel conversion for the selected period', async () => {
    const { service } = build();
    const result = await service.getOverview({ recentLimit: 20 });

    expect(result.stages[0]).toMatchObject({ count: 100 });
    expect(result.stages[1]).toMatchObject({
      count: 25,
      conversionFromPrevious: 25,
    });
  });
});
