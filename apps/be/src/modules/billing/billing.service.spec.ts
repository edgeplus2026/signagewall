import { Types } from 'mongoose';

import { BusinessException } from '../../common/exceptions/business.exception';
import { UserPlan, UserRole } from '../users/schemas/user.schema';
import { BillingService } from './billing.service';
import {
  BillingAccountStatus,
  BillingInterval,
} from './schemas/billing-account.schema';
import {
  ManualInvoiceActivityType,
  ManualInvoiceStatus,
} from './schemas/manual-invoice.schema';

const ACTOR_ID = new Types.ObjectId().toString();
const CUSTOMER_ID = new Types.ObjectId();
const ACCOUNT_ID = new Types.ObjectId();
const INVOICE_ID = new Types.ObjectId();

const account = (overrides: Record<string, unknown> = {}) => ({
  _id: ACCOUNT_ID,
  ownerUserId: CUSTOMER_ID,
  billingEmail: 'billing@example.com',
  status: BillingAccountStatus.TRIALING,
  billingInterval: BillingInterval.MONTHLY,
  screenQuantity: 1,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  graceEndsAt: null,
  trialConsumedAt: new Date('2026-07-01'),
  createdAt: new Date('2026-07-01'),
  updatedAt: new Date('2026-07-01'),
  ...overrides,
});

const invoice = (overrides: Record<string, unknown> = {}) => ({
  _id: INVOICE_ID,
  billingAccountId: ACCOUNT_ID,
  customerUserId: CUSTOMER_ID,
  customerName: 'Customer',
  billingEmail: 'billing@example.com',
  screenQuantity: 2,
  servicePeriodStart: null,
  servicePeriodEnd: null,
  dueAt: null,
  status: ManualInvoiceStatus.DRAFT,
  sentAt: null,
  sentBy: null,
  paidAt: null,
  paidBy: null,
  voidedAt: null,
  voidedBy: null,
  archivedAt: null,
  archivedBy: null,
  activity: [
    {
      type: ManualInvoiceActivityType.CREATED,
      actorUserId: new Types.ObjectId(ACTOR_ID),
      occurredAt: new Date('2026-08-01'),
    },
  ],
  createdAt: new Date('2026-08-01'),
  updatedAt: new Date('2026-08-01'),
  ...overrides,
});

const completeInvoice = (overrides: Record<string, unknown> = {}) =>
  invoice({
    invoiceNumber: 'INV-001',
    amountMinor: 12000,
    currency: 'EUR',
    servicePeriodStart: new Date('2026-08-01'),
    servicePeriodEnd: new Date('2026-09-01'),
    dueAt: new Date('2026-08-15'),
    ...overrides,
  });

function build() {
  const billingRepository = {
    ensureAccount: jest.fn().mockResolvedValue(account()),
    createInvoice: jest.fn().mockResolvedValue(invoice()),
    findInvoiceById: jest.fn().mockResolvedValue(invoice()),
    updateDraft: jest.fn(),
    transitionInvoice: jest.fn(),
    archiveInvoice: jest.fn(),
    findAccountById: jest.fn().mockResolvedValue(account()),
    findAccountByOwner: jest.fn().mockResolvedValue(null),
    updateAccount: jest.fn().mockResolvedValue(account()),
    listInvoices: jest.fn(),
    findInvoicesByStatuses: jest.fn().mockResolvedValue([]),
    findSentInvoicesDueBefore: jest.fn().mockResolvedValue([]),
    findAccountsByStatuses: jest.fn().mockResolvedValue([]),
    hasRenewalInvoice: jest.fn().mockResolvedValue(false),
    hasInvoiceForCustomerSince: jest.fn().mockResolvedValue(false),
    countAccounts: jest.fn().mockResolvedValue(0),
    countInvoices: jest.fn().mockResolvedValue(0),
    outstandingByCurrency: jest.fn().mockResolvedValue([]),
  };

  const user = {
    _id: CUSTOMER_ID,
    name: 'Customer',
    email: 'billing@example.com',
    company: 'Example LLC',
    isActive: true,
    role: UserRole.USER,
    plan: UserPlan.FREE,
  };
  const usersRepository = {
    findById: jest.fn().mockResolvedValue(user),
    updateById: jest.fn().mockResolvedValue(user),
    findActiveEnterpriseUsers: jest.fn().mockResolvedValue([]),
  };
  const plansRepository = {
    resolveOpenForUser: jest.fn().mockResolvedValue(undefined),
    findOpen: jest.fn().mockResolvedValue([]),
  };

  const service = new BillingService(
    billingRepository as never,
    usersRepository as never,
    plansRepository as never,
    { t: (key: string) => key } as never,
  );

  return {
    service,
    billingRepository,
    usersRepository,
    plansRepository,
  };
}

describe('BillingService', () => {
  it('persists an incomplete invoice as a visible draft', async () => {
    const { service, billingRepository } = build();

    const result = await service.createInvoice(ACTOR_ID, {
      customerUserId: CUSTOMER_ID.toString(),
      screenQuantity: 2,
    });

    expect(billingRepository.createInvoice).toHaveBeenCalled();
    expect(result.status).toBe(ManualInvoiceStatus.DRAFT);
    expect(result.missingFields).toContain('invoiceNumber');
    expect(result.missingFields).toContain('dueAt');
  });

  it('refuses to mark an incomplete draft as sent', async () => {
    const { service, billingRepository } = build();

    await expect(
      service.markSent(ACTOR_ID, INVOICE_ID.toString()),
    ).rejects.toBeInstanceOf(BusinessException);
    expect(billingRepository.transitionInvoice).not.toHaveBeenCalled();
  });

  it('records payment, activates billing, and projects entitlements', async () => {
    const { service, billingRepository, usersRepository, plansRepository } =
      build();
    const sent = completeInvoice({ status: ManualInvoiceStatus.SENT });
    const paid = completeInvoice({
      status: ManualInvoiceStatus.PAID,
      paidAt: new Date('2026-08-04'),
      paymentReference: 'BANK-42',
    });
    billingRepository.findInvoiceById.mockResolvedValue(sent);
    billingRepository.transitionInvoice.mockResolvedValue(paid);

    const result = await service.markPaid(ACTOR_ID, INVOICE_ID.toString(), {
      paymentReference: 'BANK-42',
      paidAt: '2026-08-04T08:00:00.000Z',
    });

    expect(result.status).toBe(ManualInvoiceStatus.PAID);
    expect(billingRepository.updateAccount).toHaveBeenCalledWith(
      ACCOUNT_ID.toString(),
      expect.objectContaining({
        status: BillingAccountStatus.ACTIVE,
        screenQuantity: 2,
      }),
      ACTOR_ID,
    );
    expect(usersRepository.updateById).toHaveBeenCalledWith(
      CUSTOMER_ID.toString(),
      expect.objectContaining({
        plan: UserPlan.ENTERPRISE,
        screenLimit: 2,
      }),
    );
    expect(plansRepository.resolveOpenForUser).toHaveBeenCalledWith(
      CUSTOMER_ID.toString(),
      ACTOR_ID,
    );
  });

  it('marks overdue state without changing entitlement or player data', async () => {
    const { service, billingRepository, usersRepository } = build();
    const sent = completeInvoice({
      status: ManualInvoiceStatus.SENT,
      dueAt: new Date('2026-07-01'),
    });
    const overdue = completeInvoice({
      status: ManualInvoiceStatus.OVERDUE,
      dueAt: new Date('2026-07-01'),
    });
    billingRepository.findSentInvoicesDueBefore.mockResolvedValue([sent]);
    billingRepository.transitionInvoice.mockResolvedValue(overdue);
    billingRepository.findAccountById.mockResolvedValue(
      account({
        status: BillingAccountStatus.ACTIVE,
        currentPeriodEnd: new Date('2026-07-31'),
      }),
    );

    const transitioned = await service.reconcileOverdueInvoices();

    expect(transitioned).toBe(1);
    expect(billingRepository.updateAccount).toHaveBeenCalledWith(
      ACCOUNT_ID.toString(),
      expect.objectContaining({ status: BillingAccountStatus.PAST_DUE }),
    );
    expect(usersRepository.updateById).not.toHaveBeenCalled();
  });

  it('archives a paid invoice without changing customer entitlement', async () => {
    const { service, billingRepository, usersRepository } = build();
    const paid = completeInvoice({
      status: ManualInvoiceStatus.PAID,
      paidAt: new Date('2026-08-04'),
      paymentReference: 'BANK-42',
    });
    billingRepository.findInvoiceById.mockResolvedValue(paid);
    billingRepository.archiveInvoice.mockResolvedValue(
      invoice({
        ...paid,
        archivedAt: new Date('2026-08-05'),
      }),
    );

    const result = await service.archiveInvoice(
      ACTOR_ID,
      INVOICE_ID.toString(),
    );

    expect(result.status).toBe(ManualInvoiceStatus.PAID);
    expect(billingRepository.archiveInvoice).toHaveBeenCalledWith(
      INVOICE_ID.toString(),
      ACTOR_ID,
    );
    expect(usersRepository.updateById).not.toHaveBeenCalled();
  });

  it('does not archive an invoice that is still operational', async () => {
    const { service, billingRepository } = build();
    billingRepository.findInvoiceById.mockResolvedValue(
      completeInvoice({ status: ManualInvoiceStatus.SENT }),
    );

    await expect(
      service.archiveInvoice(ACTOR_ID, INVOICE_ID.toString()),
    ).rejects.toBeInstanceOf(BusinessException);
    expect(billingRepository.archiveInvoice).not.toHaveBeenCalled();
  });
});
