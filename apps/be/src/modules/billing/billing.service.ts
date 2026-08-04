import { Injectable, Logger } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

import { toPaginatedResult } from '../../common/dto/paginated-result';
import { BusinessException } from '../../common/exceptions/business.exception';
import { PlansRepository } from '../plans/plans.repository';
import { UserPlan, UserRole } from '../users/schemas/user.schema';
import { UsersRepository } from '../users/users.repository';
import {
  BillingRepository,
  UpdateManualInvoiceData,
} from './billing.repository';
import { CreateManualInvoiceDto } from './dto/create-manual-invoice.dto';
import { MarkManualInvoicePaidDto } from './dto/mark-manual-invoice-paid.dto';
import { UpdateManualInvoiceDto } from './dto/update-manual-invoice.dto';
import { VoidManualInvoiceDto } from './dto/void-manual-invoice.dto';
import {
  BillingExceptionDto,
  BillingOverviewDto,
  ManualInvoiceDto,
  PaginatedManualInvoicesDto,
  missingInvoiceFields,
  toManualInvoiceDto,
} from './mappers/billing.mapper';
import { BillingAccountStatus } from './schemas/billing-account.schema';
import {
  ManualInvoiceActivityType,
  ManualInvoiceDocument,
  ManualInvoiceStatus,
} from './schemas/manual-invoice.schema';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const DRAFT_STALE_HOURS = 24;
const PAYMENT_DUE_SOON_DAYS = 3;
const RENEWAL_LOOKAHEAD_DAYS = 7;
const DEFAULT_GRACE_DAYS = 14;

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly billingRepository: BillingRepository,
    private readonly usersRepository: UsersRepository,
    private readonly plansRepository: PlansRepository,
    private readonly i18n: I18nService,
  ) {}

  async createInvoice(
    actorUserId: string,
    dto: CreateManualInvoiceDto,
  ): Promise<ManualInvoiceDto> {
    const user = await this.usersRepository.findById(dto.customerUserId);

    if (!user || !user.isActive) {
      throw BusinessException.notFound(this.i18n.t('auth.userNotFound'));
    }
    if (user.role === UserRole.SUPER_ADMIN) {
      throw BusinessException.badRequest(
        this.i18n.t('billing.cannotInvoiceSuperAdmin'),
      );
    }

    const billingEmail = dto.billingEmail ?? user.email;
    const companyName = dto.companyName ?? user.company;
    this.assertPeriodOrder(
      dto.servicePeriodStart ? new Date(dto.servicePeriodStart) : null,
      dto.servicePeriodEnd ? new Date(dto.servicePeriodEnd) : null,
    );
    const account = await this.billingRepository.ensureAccount({
      ownerUserId: user._id.toString(),
      ...(companyName ? { companyName } : {}),
      billingEmail,
      screenQuantity: dto.screenQuantity,
      status:
        user.plan === UserPlan.ENTERPRISE
          ? BillingAccountStatus.ACTIVE
          : BillingAccountStatus.TRIALING,
      actorUserId,
    });

    try {
      const invoice = await this.billingRepository.createInvoice({
        billingAccountId: account._id.toString(),
        customerUserId: user._id.toString(),
        customerName: user.name,
        ...(companyName ? { companyName } : {}),
        billingEmail,
        ...(dto.invoiceNumber ? { invoiceNumber: dto.invoiceNumber } : {}),
        ...(dto.amountMinor !== undefined
          ? { amountMinor: dto.amountMinor }
          : {}),
        ...(dto.currency ? { currency: dto.currency } : {}),
        screenQuantity: dto.screenQuantity,
        ...(dto.servicePeriodStart
          ? { servicePeriodStart: new Date(dto.servicePeriodStart) }
          : {}),
        ...(dto.servicePeriodEnd
          ? { servicePeriodEnd: new Date(dto.servicePeriodEnd) }
          : {}),
        ...(dto.dueAt ? { dueAt: new Date(dto.dueAt) } : {}),
        ...(dto.note ? { note: dto.note } : {}),
        actorUserId,
      });

      return toManualInvoiceDto(invoice);
    } catch (error) {
      this.rethrowDuplicateInvoiceNumber(error);
      throw error;
    }
  }

  async updateInvoice(
    actorUserId: string,
    invoiceId: string,
    dto: UpdateManualInvoiceDto,
  ): Promise<ManualInvoiceDto> {
    const current = await this.getInvoiceDocument(invoiceId);
    if (current.status !== ManualInvoiceStatus.DRAFT) {
      throw BusinessException.badRequest(
        this.i18n.t('billing.onlyDraftEditable'),
      );
    }

    const update = this.toUpdateData(dto);
    const periodStart = update.servicePeriodStart ?? current.servicePeriodStart;
    const periodEnd = update.servicePeriodEnd ?? current.servicePeriodEnd;
    this.assertPeriodOrder(periodStart, periodEnd);

    try {
      const invoice = await this.billingRepository.updateDraft(
        invoiceId,
        update,
        actorUserId,
      );
      if (!invoice) {
        throw BusinessException.badRequest(
          this.i18n.t('billing.onlyDraftEditable'),
        );
      }
      return toManualInvoiceDto(invoice);
    } catch (error) {
      this.rethrowDuplicateInvoiceNumber(error);
      throw error;
    }
  }

  async markSent(
    actorUserId: string,
    invoiceId: string,
  ): Promise<ManualInvoiceDto> {
    const current = await this.getInvoiceDocument(invoiceId);

    if (
      current.status === ManualInvoiceStatus.SENT ||
      current.status === ManualInvoiceStatus.OVERDUE ||
      current.status === ManualInvoiceStatus.PAID
    ) {
      return toManualInvoiceDto(current);
    }
    if (current.status !== ManualInvoiceStatus.DRAFT) {
      throw BusinessException.badRequest(this.i18n.t('billing.cannotMarkSent'));
    }

    this.assertReadyToSend(current);
    const sentAt = new Date();
    const invoice = await this.billingRepository.transitionInvoice({
      id: invoiceId,
      from: [ManualInvoiceStatus.DRAFT],
      to: ManualInvoiceStatus.SENT,
      set: {
        sentAt,
        sentBy: actorUserId,
      },
      activityType: ManualInvoiceActivityType.SENT,
      actorUserId,
    });

    if (!invoice) {
      return toManualInvoiceDto(await this.getInvoiceDocument(invoiceId));
    }

    const account = await this.billingRepository.findAccountById(
      invoice.billingAccountId.toString(),
    );
    if (account) {
      const paidPeriodStillActive =
        account.status === BillingAccountStatus.ACTIVE &&
        account.currentPeriodEnd !== null &&
        account.currentPeriodEnd.getTime() > Date.now();

      await this.billingRepository.updateAccount(
        account._id.toString(),
        {
          billingEmail: invoice.billingEmail,
          companyName: invoice.companyName,
          screenQuantity: invoice.screenQuantity,
          ...(paidPeriodStillActive
            ? {}
            : { status: BillingAccountStatus.PENDING_INVOICE }),
        },
        actorUserId,
      );
    }

    return toManualInvoiceDto(invoice);
  }

  async markPaid(
    actorUserId: string,
    invoiceId: string,
    dto: MarkManualInvoicePaidDto,
  ): Promise<ManualInvoiceDto> {
    const current = await this.getInvoiceDocument(invoiceId);
    this.assertReadyToSend(current);

    if (current.status === ManualInvoiceStatus.PAID) {
      if (current.paymentReference !== dto.paymentReference) {
        throw BusinessException.conflict(
          this.i18n.t('billing.paymentReferenceConflict'),
        );
      }
      await this.projectPaidInvoice(current, actorUserId);
      return toManualInvoiceDto(current);
    }

    if (
      current.status !== ManualInvoiceStatus.SENT &&
      current.status !== ManualInvoiceStatus.OVERDUE
    ) {
      throw BusinessException.badRequest(this.i18n.t('billing.cannotMarkPaid'));
    }

    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
    if (paidAt.getTime() > Date.now() + 5 * 60 * 1000) {
      throw BusinessException.badRequest(this.i18n.t('billing.paidAtInFuture'));
    }

    const invoice = await this.billingRepository.transitionInvoice({
      id: invoiceId,
      from: [ManualInvoiceStatus.SENT, ManualInvoiceStatus.OVERDUE],
      to: ManualInvoiceStatus.PAID,
      set: {
        paidAt,
        paidBy: actorUserId,
        paymentReference: dto.paymentReference,
      },
      activityType: ManualInvoiceActivityType.PAID,
      actorUserId,
      note: dto.paymentReference,
    });

    const resolved = invoice ?? (await this.getInvoiceDocument(invoiceId));
    await this.projectPaidInvoice(resolved, actorUserId);

    this.logger.log(
      `Super-admin ${actorUserId} marked invoice ${invoiceId} paid`,
    );
    return toManualInvoiceDto(resolved);
  }

  async voidInvoice(
    actorUserId: string,
    invoiceId: string,
    dto: VoidManualInvoiceDto,
  ): Promise<ManualInvoiceDto> {
    const current = await this.getInvoiceDocument(invoiceId);
    if (current.status === ManualInvoiceStatus.VOID) {
      return toManualInvoiceDto(current);
    }
    if (current.status === ManualInvoiceStatus.PAID) {
      throw BusinessException.badRequest(this.i18n.t('billing.cannotVoidPaid'));
    }

    const invoice = await this.billingRepository.transitionInvoice({
      id: invoiceId,
      from: [
        ManualInvoiceStatus.DRAFT,
        ManualInvoiceStatus.SENT,
        ManualInvoiceStatus.OVERDUE,
      ],
      to: ManualInvoiceStatus.VOID,
      set: {
        voidedAt: new Date(),
        voidedBy: actorUserId,
        voidReason: dto.reason,
      },
      activityType: ManualInvoiceActivityType.VOIDED,
      actorUserId,
      note: dto.reason,
    });

    if (!invoice) {
      return toManualInvoiceDto(await this.getInvoiceDocument(invoiceId));
    }

    const account = await this.billingRepository.findAccountById(
      invoice.billingAccountId.toString(),
    );
    if (account?.status === BillingAccountStatus.PENDING_INVOICE) {
      const hasPaidPeriod =
        account.currentPeriodEnd !== null &&
        account.currentPeriodEnd.getTime() > Date.now();
      await this.billingRepository.updateAccount(
        account._id.toString(),
        {
          status: hasPaidPeriod
            ? BillingAccountStatus.ACTIVE
            : BillingAccountStatus.TRIALING,
        },
        actorUserId,
      );
    }

    return toManualInvoiceDto(invoice);
  }

  async archiveInvoice(
    actorUserId: string,
    invoiceId: string,
  ): Promise<ManualInvoiceDto> {
    const current = await this.getInvoiceDocument(invoiceId);
    if (
      current.status !== ManualInvoiceStatus.PAID &&
      current.status !== ManualInvoiceStatus.VOID
    ) {
      throw BusinessException.badRequest(
        this.i18n.t('billing.onlyTerminalArchivable'),
      );
    }

    const archived = await this.billingRepository.archiveInvoice(
      invoiceId,
      actorUserId,
    );
    if (!archived) {
      throw BusinessException.badRequest(
        this.i18n.t('billing.onlyTerminalArchivable'),
      );
    }

    this.logger.log(`Super-admin ${actorUserId} archived invoice ${invoiceId}`);
    return toManualInvoiceDto(archived);
  }

  async listInvoices(params: {
    page: number;
    limit: number;
    status?: ManualInvoiceStatus;
  }): Promise<PaginatedManualInvoicesDto> {
    await this.reconcileOverdueInvoices();
    const { items, total } = await this.billingRepository.listInvoices(params);
    return toPaginatedResult(
      items.map(toManualInvoiceDto),
      total,
      params.page,
      params.limit,
    );
  }

  async getOverview(): Promise<BillingOverviewDto> {
    await this.reconcileOverdueInvoices();
    const exceptions = await this.collectExceptions();

    const [
      accountCount,
      activeAccountCount,
      pastDueAccountCount,
      draftInvoiceCount,
      sentInvoiceCount,
      overdueInvoiceCount,
      outstandingByCurrency,
    ] = await Promise.all([
      this.billingRepository.countAccounts(),
      this.billingRepository.countAccounts(BillingAccountStatus.ACTIVE),
      this.billingRepository.countAccounts(BillingAccountStatus.PAST_DUE),
      this.billingRepository.countInvoices(ManualInvoiceStatus.DRAFT),
      this.billingRepository.countInvoices(ManualInvoiceStatus.SENT),
      this.billingRepository.countInvoices(ManualInvoiceStatus.OVERDUE),
      this.billingRepository.outstandingByCurrency(),
    ]);

    return {
      accountCount,
      activeAccountCount,
      pastDueAccountCount,
      draftInvoiceCount,
      sentInvoiceCount,
      overdueInvoiceCount,
      exceptionCount: exceptions.length,
      criticalExceptionCount: exceptions.filter(
        (item) => item.severity === 'critical',
      ).length,
      outstandingByCurrency,
    };
  }

  async listExceptions(): Promise<BillingExceptionDto[]> {
    await this.reconcileOverdueInvoices();
    return this.collectExceptions();
  }

  /**
   * Changes only commercial alert state. It intentionally never changes
   * User.plan, screenLimit or player data, so a missed invoice cannot blank a
   * display. Suspension remains an explicit future admin action.
   */
  async reconcileOverdueInvoices(): Promise<number> {
    const overdue = await this.billingRepository.findSentInvoicesDueBefore(
      new Date(),
    );
    let transitioned = 0;

    for (const invoice of overdue) {
      const updated = await this.billingRepository.transitionInvoice({
        id: invoice._id.toString(),
        from: [ManualInvoiceStatus.SENT],
        to: ManualInvoiceStatus.OVERDUE,
        set: {},
        activityType: ManualInvoiceActivityType.MARKED_OVERDUE,
      });
      if (!updated) continue;

      transitioned += 1;
      const account = await this.billingRepository.findAccountById(
        invoice.billingAccountId.toString(),
      );
      if (!account) continue;

      const paidPeriodEnded =
        account.currentPeriodEnd === null ||
        account.currentPeriodEnd.getTime() <= Date.now();
      if (paidPeriodEnded) {
        await this.billingRepository.updateAccount(account._id.toString(), {
          status: BillingAccountStatus.PAST_DUE,
          graceEndsAt: new Date(
            (invoice.dueAt?.getTime() ?? Date.now()) +
              DEFAULT_GRACE_DAYS * DAY_MS,
          ),
        });
      }
    }

    return transitioned;
  }

  private async collectExceptions(): Promise<BillingExceptionDto[]> {
    const now = Date.now();
    const dueSoon = now + PAYMENT_DUE_SOON_DAYS * DAY_MS;
    const renewalThreshold = now + RENEWAL_LOOKAHEAD_DAYS * DAY_MS;
    const exceptions: BillingExceptionDto[] = [];

    const invoices = await this.billingRepository.findInvoicesByStatuses([
      ManualInvoiceStatus.DRAFT,
      ManualInvoiceStatus.SENT,
      ManualInvoiceStatus.OVERDUE,
    ]);

    for (const invoice of invoices) {
      if (invoice.status === ManualInvoiceStatus.DRAFT) {
        const missingFields = missingInvoiceFields(invoice);
        if (missingFields.length > 0) {
          exceptions.push({
            key: `draft-incomplete:${invoice._id.toString()}`,
            type: 'draft_incomplete',
            severity: 'warning',
            customerUserId: invoice.customerUserId.toString(),
            customerName: invoice.customerName,
            ...(invoice.billingEmail
              ? { customerEmail: invoice.billingEmail }
              : {}),
            invoiceId: invoice._id.toString(),
            ...(invoice.invoiceNumber
              ? { invoiceNumber: invoice.invoiceNumber }
              : {}),
            missingFields,
          });
        } else if (
          invoice.createdAt.getTime() <=
          now - DRAFT_STALE_HOURS * HOUR_MS
        ) {
          exceptions.push({
            key: `draft-ready:${invoice._id.toString()}`,
            type: 'draft_ready_to_send',
            severity: 'warning',
            customerUserId: invoice.customerUserId.toString(),
            customerName: invoice.customerName,
            ...(invoice.billingEmail
              ? { customerEmail: invoice.billingEmail }
              : {}),
            invoiceId: invoice._id.toString(),
            ...(invoice.invoiceNumber
              ? { invoiceNumber: invoice.invoiceNumber }
              : {}),
          });
        }
      }

      if (
        invoice.status === ManualInvoiceStatus.SENT &&
        invoice.dueAt &&
        invoice.dueAt.getTime() <= dueSoon
      ) {
        exceptions.push({
          key: `payment-due:${invoice._id.toString()}`,
          type: 'payment_due_soon',
          severity: 'warning',
          customerUserId: invoice.customerUserId.toString(),
          customerName: invoice.customerName,
          ...(invoice.billingEmail
            ? { customerEmail: invoice.billingEmail }
            : {}),
          invoiceId: invoice._id.toString(),
          ...(invoice.invoiceNumber
            ? { invoiceNumber: invoice.invoiceNumber }
            : {}),
          dueAt: invoice.dueAt.toISOString(),
        });
      }

      if (invoice.status === ManualInvoiceStatus.OVERDUE) {
        exceptions.push({
          key: `payment-overdue:${invoice._id.toString()}`,
          type: 'payment_overdue',
          severity: 'critical',
          customerUserId: invoice.customerUserId.toString(),
          customerName: invoice.customerName,
          ...(invoice.billingEmail
            ? { customerEmail: invoice.billingEmail }
            : {}),
          invoiceId: invoice._id.toString(),
          ...(invoice.invoiceNumber
            ? { invoiceNumber: invoice.invoiceNumber }
            : {}),
          ...(invoice.dueAt ? { dueAt: invoice.dueAt.toISOString() } : {}),
        });
      }
    }

    const openUpgradeRequests = await this.plansRepository.findOpen();
    for (const request of openUpgradeRequests) {
      const customerUserId = request.userId.toString();
      const hasInvoice =
        await this.billingRepository.hasInvoiceForCustomerSince(
          customerUserId,
          request.createdAt,
        );
      if (hasInvoice) continue;

      const user = await this.usersRepository.findById(customerUserId);
      const trialEndsSoon =
        user?.trialEndsAt !== null &&
        user?.trialEndsAt !== undefined &&
        user.trialEndsAt.getTime() <= dueSoon;

      exceptions.push({
        key: `upgrade-without-invoice:${request._id.toString()}`,
        type: 'upgrade_request_without_invoice',
        severity: trialEndsSoon ? 'critical' : 'warning',
        customerUserId,
        customerName: user?.name ?? request.company ?? 'Unknown customer',
        ...(user?.email ? { customerEmail: user.email } : {}),
        ...(user?.trialEndsAt
          ? { currentPeriodEnd: user.trialEndsAt.toISOString() }
          : {}),
      });
    }

    const accounts = await this.billingRepository.findAccountsByStatuses([
      BillingAccountStatus.ACTIVE,
      BillingAccountStatus.PAST_DUE,
    ]);
    const accountOwnerIds = new Set(
      accounts.map((account) => account.ownerUserId.toString()),
    );

    for (const account of accounts) {
      const user = await this.usersRepository.findById(
        account.ownerUserId.toString(),
      );
      const customerName =
        user?.name ?? account.companyName ?? 'Unknown customer';
      const customerEmail = account.billingEmail ?? user?.email;

      if (!account.currentPeriodEnd) {
        exceptions.push({
          key: `missing-period:${account._id.toString()}`,
          type: 'active_account_missing_period',
          severity: 'critical',
          customerUserId: account.ownerUserId.toString(),
          customerName,
          ...(customerEmail ? { customerEmail } : {}),
        });
        continue;
      }

      if (account.currentPeriodEnd.getTime() <= renewalThreshold) {
        const hasRenewal = await this.billingRepository.hasRenewalInvoice(
          account.ownerUserId.toString(),
          account.currentPeriodEnd,
        );
        if (!hasRenewal) {
          exceptions.push({
            key: `renewal-missing:${account._id.toString()}`,
            type: 'renewal_invoice_missing',
            severity: 'warning',
            customerUserId: account.ownerUserId.toString(),
            customerName,
            ...(customerEmail ? { customerEmail } : {}),
            currentPeriodEnd: account.currentPeriodEnd.toISOString(),
          });
        }
      }
    }

    const legacyPaidUsers =
      await this.usersRepository.findActiveEnterpriseUsers();
    for (const user of legacyPaidUsers) {
      if (accountOwnerIds.has(user._id.toString())) continue;

      const account = await this.billingRepository.findAccountByOwner(
        user._id.toString(),
      );
      if (account) continue;

      exceptions.push({
        key: `legacy-paid:${user._id.toString()}`,
        type: 'active_plan_without_billing_record',
        severity: 'critical',
        customerUserId: user._id.toString(),
        customerName: user.name,
        customerEmail: user.email,
      });
    }

    return exceptions.sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
      return a.type.localeCompare(b.type);
    });
  }

  private async projectPaidInvoice(
    invoice: ManualInvoiceDocument,
    actorUserId: string,
  ): Promise<void> {
    this.assertReadyToSend(invoice);

    const [account, user] = await Promise.all([
      this.billingRepository.findAccountById(
        invoice.billingAccountId.toString(),
      ),
      this.usersRepository.findById(invoice.customerUserId.toString()),
    ]);
    if (!account || !user) {
      throw BusinessException.notFound(this.i18n.t('billing.customerNotFound'));
    }

    await this.billingRepository.updateAccount(
      account._id.toString(),
      {
        status: BillingAccountStatus.ACTIVE,
        billingEmail: invoice.billingEmail,
        companyName: invoice.companyName,
        screenQuantity: invoice.screenQuantity,
        currentPeriodStart: invoice.servicePeriodStart,
        currentPeriodEnd: invoice.servicePeriodEnd,
        graceEndsAt: null,
      },
      actorUserId,
    );

    await this.usersRepository.updateById(user._id.toString(), {
      plan: UserPlan.ENTERPRISE,
      screenLimit: invoice.screenQuantity,
      trialEndsAt: null,
      trialWarningSentAt: null,
    });

    await this.plansRepository.resolveOpenForUser(
      user._id.toString(),
      actorUserId,
    );
  }

  private async getInvoiceDocument(
    invoiceId: string,
  ): Promise<ManualInvoiceDocument> {
    const invoice = await this.billingRepository.findInvoiceById(invoiceId);
    if (!invoice) {
      throw BusinessException.notFound(this.i18n.t('billing.invoiceNotFound'));
    }
    return invoice;
  }

  private assertReadyToSend(invoice: ManualInvoiceDocument): void {
    const missingFields = missingInvoiceFields(invoice);
    if (missingFields.length > 0) {
      throw BusinessException.badRequest(
        this.i18n.t('billing.invoiceIncomplete'),
        { missingFields },
      );
    }
    this.assertPeriodOrder(
      invoice.servicePeriodStart,
      invoice.servicePeriodEnd,
    );
  }

  private assertPeriodOrder(start: Date | null, end: Date | null): void {
    if (start && end && end.getTime() <= start.getTime()) {
      throw BusinessException.badRequest(
        this.i18n.t('billing.invalidServicePeriod'),
      );
    }
  }

  private toUpdateData(dto: UpdateManualInvoiceDto): UpdateManualInvoiceData {
    return {
      ...(dto.screenQuantity !== undefined
        ? { screenQuantity: dto.screenQuantity }
        : {}),
      ...(dto.invoiceNumber !== undefined
        ? { invoiceNumber: dto.invoiceNumber }
        : {}),
      ...(dto.amountMinor !== undefined
        ? { amountMinor: dto.amountMinor }
        : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
      ...(dto.billingEmail !== undefined
        ? { billingEmail: dto.billingEmail.toLowerCase() }
        : {}),
      ...(dto.companyName !== undefined
        ? { companyName: dto.companyName }
        : {}),
      ...(dto.dueAt !== undefined ? { dueAt: new Date(dto.dueAt) } : {}),
      ...(dto.servicePeriodStart !== undefined
        ? { servicePeriodStart: new Date(dto.servicePeriodStart) }
        : {}),
      ...(dto.servicePeriodEnd !== undefined
        ? { servicePeriodEnd: new Date(dto.servicePeriodEnd) }
        : {}),
      ...(dto.note !== undefined ? { note: dto.note } : {}),
    };
  }

  private rethrowDuplicateInvoiceNumber(error: unknown): void {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 11000
    ) {
      throw BusinessException.conflict(
        this.i18n.t('billing.invoiceNumberExists'),
      );
    }
  }
}
