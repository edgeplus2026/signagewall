import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';

import { SchedulerLockService } from '../../common/redis/scheduler-lock.service';
import { MailService } from '../mail/mail.service';
import { BillingService } from './billing.service';
import { BillingExceptionType } from './mappers/billing.mapper';

const LABELS: Record<BillingExceptionType, string> = {
  draft_incomplete: 'Invoice draft is missing required data',
  draft_ready_to_send: 'Complete invoice draft has not been marked as sent',
  payment_due_soon: 'Payment is due soon and has not been recorded',
  payment_overdue: 'Invoice is overdue',
  upgrade_request_without_invoice: 'Upgrade request has no invoice draft',
  active_plan_without_billing_record: 'Paid plan has no billing record',
  active_account_missing_period: 'Active account has no billing period',
  renewal_invoice_missing: 'Billing period ends soon without a renewal invoice',
};

@Injectable()
export class BillingReminderScheduler {
  private readonly logger = new Logger(BillingReminderScheduler.name);

  constructor(
    private readonly billingService: BillingService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly lock: SchedulerLockService,
  ) {}

  /** 08:00 Belgrade time; overdue state is alert-only and never blocks players. */
  @Cron('0 8 * * *', { timeZone: 'Europe/Belgrade' })
  async sendDailyDigest(): Promise<number> {
    // One digest per day for the deployment, not one per API instance.
    if (!(await this.lock.isLeader('billing-digest', 30 * 60_000))) {
      return 0;
    }
    const exceptions = await this.billingService.listExceptions();
    if (exceptions.length === 0) return 0;

    const frontendUrl = this.configService
      .getOrThrow<string>('frontendUrl')
      .replace(/\/$/, '');

    try {
      await this.mailService.sendBillingAlertEmail({
        adminUrl: `${frontendUrl}/super-admin?tab=billing`,
        items: exceptions.map((item) => ({
          severity: item.severity,
          label: LABELS[item.type],
          customerName: item.customerName,
          ...(item.customerEmail ? { customerEmail: item.customerEmail } : {}),
          ...(item.invoiceNumber ? { invoiceNumber: item.invoiceNumber } : {}),
          ...(item.dueAt
            ? { dueAt: new Date(item.dueAt).toISOString().slice(0, 10) }
            : {}),
        })),
      });
      return exceptions.length;
    } catch (error) {
      this.logger.error(
        'Billing reminder email failed',
        error instanceof Error ? error.stack : String(error),
      );
      return 0;
    }
  }
}
