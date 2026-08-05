import { Types } from 'mongoose';

import { FunnelEventName } from '../analytics/schemas/funnel-event.schema';
import { CrmService } from './crm.service';
import {
  CrmLeadEmailStatus,
  CrmLeadStatus,
  CrmLeadType,
} from './schemas/crm-lead.schema';

const LEAD_ID = new Types.ObjectId();
const ACTOR_ID = new Types.ObjectId().toString();

const lead = (overrides: Record<string, unknown> = {}) => ({
  _id: LEAD_ID,
  submissionId: '33490ddc-3652-4c83-8751-d7eca7451a01',
  type: CrmLeadType.QUOTE,
  status: CrmLeadStatus.NEW,
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'Please send a quote.',
  screenQuantity: 8,
  firstTouch: { source: 'google', medium: 'cpc', campaign: 'launch' },
  lastTouch: { source: 'newsletter', medium: 'email', campaign: 'follow-up' },
  emailNotificationStatus: CrmLeadEmailStatus.PENDING,
  emailNotificationAt: null,
  statusHistory: [
    {
      status: CrmLeadStatus.NEW,
      actorUserId: null,
      occurredAt: new Date('2026-08-04T10:00:00.000Z'),
    },
  ],
  internalNotes: [],
  archivedAt: null,
  createdAt: new Date('2026-08-04T10:00:00.000Z'),
  updatedAt: new Date('2026-08-04T10:00:00.000Z'),
  ...overrides,
});

function build() {
  const repository = {
    findBySubmissionId: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(lead()),
    list: jest.fn().mockResolvedValue({ items: [lead()], total: 1 }),
    findById: jest.fn().mockResolvedValue(lead()),
    update: jest.fn().mockResolvedValue(lead()),
    updateEmailStatus: jest.fn().mockResolvedValue(lead()),
    statusCounts: jest.fn().mockResolvedValue([
      { _id: CrmLeadStatus.NEW, count: 2 },
      { _id: CrmLeadStatus.WON, count: 1 },
    ]),
  };
  const analytics = {
    parseAcquisitionToken: jest.fn().mockReturnValue({
      anonymousId: 'anon-token',
      firstTouch: { source: 'google', medium: 'cpc', campaign: 'launch' },
      lastTouch: { source: 'newsletter', medium: 'email' },
    }),
    record: jest.fn().mockResolvedValue(undefined),
  };
  const mail = { sendCrmLeadEmail: jest.fn().mockResolvedValue(true) };
  const service = new CrmService(
    repository as never,
    analytics as never,
    mail as never,
  );
  return { service, repository, analytics, mail };
}

describe('CrmService', () => {
  const payload = {
    submissionId: '33490ddc-3652-4c83-8751-d7eca7451a01',
    type: CrmLeadType.QUOTE,
    name: '  Ada Lovelace  ',
    email: 'ada@example.com',
    message: '  Please send a quote.  ',
    screenQuantity: 8,
    anonymousId: 'anon-form',
    acquisitionToken: 'token',
  };

  it('stores contact PII in CRM while the funnel event contains only allowlisted metadata', async () => {
    const { service, repository, analytics, mail } = build();

    await service.createLead(payload);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        message: 'Please send a quote.',
        anonymousId: 'anon-form',
        firstTouch: expect.objectContaining({ source: 'google' }),
      }),
    );
    expect(analytics.record).toHaveBeenCalledWith({
      eventName: FunnelEventName.GENERATE_LEAD,
      anonymousId: 'anon-form',
      acquisitionToken: 'token',
      leadType: CrmLeadType.QUOTE,
      dedupeKey: `generate_lead:crm:${LEAD_ID.toString()}`,
      properties: { form: CrmLeadType.QUOTE, screenQuantity: 8 },
    });
    expect(JSON.stringify(analytics.record.mock.calls)).not.toContain(
      'ada@example.com',
    );

    await Promise.resolve();
    expect(mail.sendCrmLeadEmail).toHaveBeenCalled();
  });

  it('treats a repeated submission id as success without creating or notifying twice', async () => {
    const { service, repository, analytics, mail } = build();
    repository.findBySubmissionId.mockResolvedValue(lead());

    await service.createLead(payload);

    expect(repository.create).not.toHaveBeenCalled();
    expect(analytics.record).not.toHaveBeenCalled();
    expect(mail.sendCrmLeadEmail).not.toHaveBeenCalled();
  });

  it('adds founder status changes and internal notes with the actor id', async () => {
    const { service, repository } = build();

    await service.update(LEAD_ID.toString(), ACTOR_ID, {
      status: CrmLeadStatus.CONTACTED,
      note: 'Called the prospect.',
    });

    expect(repository.update).toHaveBeenCalledWith(
      LEAD_ID.toString(),
      ACTOR_ID,
      {
        status: CrmLeadStatus.CONTACTED,
        note: 'Called the prospect.',
      },
    );
  });

  it('returns all CRM status counters from a single aggregate result', async () => {
    const { service, repository } = build();

    const result = await service.overview();

    expect(repository.statusCounts).toHaveBeenCalledTimes(1);
    expect(result.total).toBe(3);
    expect(result.byStatus).toMatchObject({
      new: 2,
      won: 1,
      contacted: 0,
      spam: 0,
    });
  });
});
