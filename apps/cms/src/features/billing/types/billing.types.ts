export type ManualInvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void'

export type RequiredInvoiceField =
  | 'invoiceNumber'
  | 'amountMinor'
  | 'currency'
  | 'billingEmail'
  | 'dueAt'
  | 'servicePeriodStart'
  | 'servicePeriodEnd'

export interface ManualInvoiceActivity {
  type: 'created' | 'updated' | 'sent' | 'paid' | 'marked_overdue' | 'voided' | 'archived'
  actorUserId: string | null
  occurredAt: string
  note?: string
}

export interface ManualInvoice {
  id: string
  billingAccountId: string
  customerUserId: string
  customerName: string
  companyName?: string
  billingEmail?: string
  invoiceNumber?: string
  amountMinor?: number
  currency?: string
  screenQuantity: number
  servicePeriodStart: string | null
  servicePeriodEnd: string | null
  dueAt: string | null
  status: ManualInvoiceStatus
  note?: string
  sentAt: string | null
  paidAt: string | null
  paymentReference?: string
  voidedAt: string | null
  voidReason?: string
  missingFields: RequiredInvoiceField[]
  activity: ManualInvoiceActivity[]
  createdAt: string
  updatedAt: string
}

export interface PaginatedManualInvoices {
  items: ManualInvoice[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface BillingOverview {
  accountCount: number
  activeAccountCount: number
  pastDueAccountCount: number
  draftInvoiceCount: number
  sentInvoiceCount: number
  overdueInvoiceCount: number
  exceptionCount: number
  criticalExceptionCount: number
  outstandingByCurrency: { currency: string; amountMinor: number }[]
}

export type BillingExceptionType =
  | 'draft_incomplete'
  | 'draft_ready_to_send'
  | 'payment_due_soon'
  | 'payment_overdue'
  | 'upgrade_request_without_invoice'
  | 'active_plan_without_billing_record'
  | 'active_account_missing_period'
  | 'renewal_invoice_missing'

export interface BillingException {
  key: string
  type: BillingExceptionType
  severity: 'warning' | 'critical'
  customerUserId: string
  customerName: string
  customerEmail?: string
  invoiceId?: string
  invoiceNumber?: string
  dueAt?: string
  currentPeriodEnd?: string
  missingFields?: RequiredInvoiceField[]
}

export interface ManualInvoicePayload {
  customerUserId: string
  screenQuantity: number
  invoiceNumber?: string
  amountMinor?: number
  currency?: string
  billingEmail?: string
  companyName?: string
  dueAt?: string
  servicePeriodStart?: string
  servicePeriodEnd?: string
  note?: string
}

export type UpdateManualInvoicePayload = Omit<Partial<ManualInvoicePayload>, 'customerUserId'>
