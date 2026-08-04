import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ManualInvoiceActivityResponseSchema {
  @ApiProperty({
    enum: [
      'created',
      'updated',
      'sent',
      'paid',
      'marked_overdue',
      'voided',
      'archived',
    ],
  })
  type: string;

  @ApiProperty({ nullable: true })
  actorUserId: string | null;

  @ApiProperty({ format: 'date-time' })
  occurredAt: string;

  @ApiPropertyOptional()
  note?: string;
}

export class ManualInvoiceResponseSchema {
  @ApiProperty()
  id: string;

  @ApiProperty()
  billingAccountId: string;

  @ApiProperty()
  customerUserId: string;

  @ApiProperty()
  customerName: string;

  @ApiPropertyOptional()
  companyName?: string;

  @ApiPropertyOptional()
  billingEmail?: string;

  @ApiPropertyOptional()
  invoiceNumber?: string;

  @ApiPropertyOptional()
  amountMinor?: number;

  @ApiPropertyOptional()
  currency?: string;

  @ApiProperty()
  screenQuantity: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  servicePeriodStart: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  servicePeriodEnd: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  dueAt: string | null;

  @ApiProperty({ enum: ['draft', 'sent', 'paid', 'overdue', 'void'] })
  status: string;

  @ApiPropertyOptional()
  note?: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  sentAt: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  paidAt: string | null;

  @ApiPropertyOptional()
  paymentReference?: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  voidedAt: string | null;

  @ApiPropertyOptional()
  voidReason?: string;

  @ApiProperty({ type: [String] })
  missingFields: string[];

  @ApiProperty({ type: [ManualInvoiceActivityResponseSchema] })
  activity: ManualInvoiceActivityResponseSchema[];

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt: string;
}

export class PaginatedManualInvoicesResponseSchema {
  @ApiProperty({ type: [ManualInvoiceResponseSchema] })
  items: ManualInvoiceResponseSchema[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class OutstandingAmountResponseSchema {
  @ApiProperty()
  currency: string;

  @ApiProperty()
  amountMinor: number;
}

export class BillingOverviewResponseSchema {
  @ApiProperty()
  accountCount: number;

  @ApiProperty()
  activeAccountCount: number;

  @ApiProperty()
  pastDueAccountCount: number;

  @ApiProperty()
  draftInvoiceCount: number;

  @ApiProperty()
  sentInvoiceCount: number;

  @ApiProperty()
  overdueInvoiceCount: number;

  @ApiProperty()
  exceptionCount: number;

  @ApiProperty()
  criticalExceptionCount: number;

  @ApiProperty({ type: [OutstandingAmountResponseSchema] })
  outstandingByCurrency: OutstandingAmountResponseSchema[];
}

export class BillingExceptionResponseSchema {
  @ApiProperty()
  key: string;

  @ApiProperty({
    enum: [
      'draft_incomplete',
      'draft_ready_to_send',
      'payment_due_soon',
      'payment_overdue',
      'upgrade_request_without_invoice',
      'active_plan_without_billing_record',
      'active_account_missing_period',
      'renewal_invoice_missing',
    ],
  })
  type: string;

  @ApiProperty({ enum: ['warning', 'critical'] })
  severity: string;

  @ApiProperty()
  customerUserId: string;

  @ApiProperty()
  customerName: string;

  @ApiPropertyOptional()
  customerEmail?: string;

  @ApiPropertyOptional()
  invoiceId?: string;

  @ApiPropertyOptional()
  invoiceNumber?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  dueAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  currentPeriodEnd?: string;

  @ApiPropertyOptional({ type: [String] })
  missingFields?: string[];
}
