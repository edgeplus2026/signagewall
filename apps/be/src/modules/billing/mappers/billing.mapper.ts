import { PaginatedResult } from '../../../common/dto/paginated-result';
import {
  BillingAccountDocument,
  BillingAccountStatus,
  BillingInterval,
} from '../schemas/billing-account.schema';
import {
  ManualInvoiceActivityType,
  ManualInvoiceDocument,
  ManualInvoiceStatus,
} from '../schemas/manual-invoice.schema';

export const REQUIRED_INVOICE_FIELDS = [
  'invoiceNumber',
  'amountMinor',
  'currency',
  'billingEmail',
  'dueAt',
  'servicePeriodStart',
  'servicePeriodEnd',
] as const;

export type RequiredInvoiceField = (typeof REQUIRED_INVOICE_FIELDS)[number];

export interface ManualInvoiceActivityDto {
  type: ManualInvoiceActivityType;
  actorUserId: string | null;
  occurredAt: string;
  note?: string;
}

export interface ManualInvoiceDto {
  id: string;
  billingAccountId: string;
  customerUserId: string;
  customerName: string;
  companyName?: string;
  billingEmail?: string;
  invoiceNumber?: string;
  amountMinor?: number;
  currency?: string;
  screenQuantity: number;
  servicePeriodStart: string | null;
  servicePeriodEnd: string | null;
  dueAt: string | null;
  status: ManualInvoiceStatus;
  note?: string;
  sentAt: string | null;
  paidAt: string | null;
  paymentReference?: string;
  voidedAt: string | null;
  voidReason?: string;
  missingFields: RequiredInvoiceField[];
  activity: ManualInvoiceActivityDto[];
  createdAt: string;
  updatedAt: string;
}

export type PaginatedManualInvoicesDto = PaginatedResult<ManualInvoiceDto>;

export interface BillingAccountDto {
  id: string;
  ownerUserId: string;
  companyName?: string;
  billingEmail?: string;
  status: BillingAccountStatus;
  billingInterval: BillingInterval;
  screenQuantity: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  graceEndsAt: string | null;
  trialConsumedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type BillingExceptionType =
  | 'draft_incomplete'
  | 'draft_ready_to_send'
  | 'payment_due_soon'
  | 'payment_overdue'
  | 'upgrade_request_without_invoice'
  | 'active_plan_without_billing_record'
  | 'active_account_missing_period'
  | 'renewal_invoice_missing';

export interface BillingExceptionDto {
  key: string;
  type: BillingExceptionType;
  severity: 'warning' | 'critical';
  customerUserId: string;
  customerName: string;
  customerEmail?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  dueAt?: string;
  currentPeriodEnd?: string;
  missingFields?: RequiredInvoiceField[];
}

export interface BillingOverviewDto {
  accountCount: number;
  activeAccountCount: number;
  pastDueAccountCount: number;
  draftInvoiceCount: number;
  sentInvoiceCount: number;
  overdueInvoiceCount: number;
  exceptionCount: number;
  criticalExceptionCount: number;
  outstandingByCurrency: Array<{ currency: string; amountMinor: number }>;
}

export const missingInvoiceFields = (
  invoice: ManualInvoiceDocument,
): RequiredInvoiceField[] => {
  const missing: RequiredInvoiceField[] = [];

  if (!invoice.invoiceNumber?.trim()) missing.push('invoiceNumber');
  if (invoice.amountMinor === undefined || invoice.amountMinor === null) {
    missing.push('amountMinor');
  }
  if (!invoice.currency?.trim()) missing.push('currency');
  if (!invoice.billingEmail?.trim()) missing.push('billingEmail');
  if (!invoice.dueAt) missing.push('dueAt');
  if (!invoice.servicePeriodStart) missing.push('servicePeriodStart');
  if (!invoice.servicePeriodEnd) missing.push('servicePeriodEnd');

  return missing;
};

export const toManualInvoiceDto = (
  invoice: ManualInvoiceDocument,
): ManualInvoiceDto => ({
  id: invoice._id.toString(),
  billingAccountId: invoice.billingAccountId.toString(),
  customerUserId: invoice.customerUserId.toString(),
  customerName: invoice.customerName,
  ...(invoice.companyName ? { companyName: invoice.companyName } : {}),
  ...(invoice.billingEmail ? { billingEmail: invoice.billingEmail } : {}),
  ...(invoice.invoiceNumber ? { invoiceNumber: invoice.invoiceNumber } : {}),
  ...(invoice.amountMinor !== undefined
    ? { amountMinor: invoice.amountMinor }
    : {}),
  ...(invoice.currency ? { currency: invoice.currency } : {}),
  screenQuantity: invoice.screenQuantity,
  servicePeriodStart: invoice.servicePeriodStart?.toISOString() ?? null,
  servicePeriodEnd: invoice.servicePeriodEnd?.toISOString() ?? null,
  dueAt: invoice.dueAt?.toISOString() ?? null,
  status: invoice.status,
  ...(invoice.note ? { note: invoice.note } : {}),
  sentAt: invoice.sentAt?.toISOString() ?? null,
  paidAt: invoice.paidAt?.toISOString() ?? null,
  ...(invoice.paymentReference
    ? { paymentReference: invoice.paymentReference }
    : {}),
  voidedAt: invoice.voidedAt?.toISOString() ?? null,
  ...(invoice.voidReason ? { voidReason: invoice.voidReason } : {}),
  missingFields: missingInvoiceFields(invoice),
  activity: invoice.activity.map((event) => ({
    type: event.type,
    actorUserId: event.actorUserId?.toString() ?? null,
    occurredAt: event.occurredAt.toISOString(),
    ...(event.note ? { note: event.note } : {}),
  })),
  createdAt: invoice.createdAt.toISOString(),
  updatedAt: invoice.updatedAt.toISOString(),
});

export const toBillingAccountDto = (
  account: BillingAccountDocument,
): BillingAccountDto => ({
  id: account._id.toString(),
  ownerUserId: account.ownerUserId.toString(),
  ...(account.companyName ? { companyName: account.companyName } : {}),
  ...(account.billingEmail ? { billingEmail: account.billingEmail } : {}),
  status: account.status,
  billingInterval: account.billingInterval,
  screenQuantity: account.screenQuantity,
  currentPeriodStart: account.currentPeriodStart?.toISOString() ?? null,
  currentPeriodEnd: account.currentPeriodEnd?.toISOString() ?? null,
  graceEndsAt: account.graceEndsAt?.toISOString() ?? null,
  trialConsumedAt: account.trialConsumedAt.toISOString(),
  createdAt: account.createdAt.toISOString(),
  updatedAt: account.updatedAt.toISOString(),
});
