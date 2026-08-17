import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import { renderEmailVerificationEmail } from './templates/email-verification.template';
import {
  type BillingAlertEmailItem,
  renderBillingAlertEmail,
} from './templates/billing-alert.template';
import { renderNewRegistrationEmail } from './templates/new-registration.template';
import { renderCrmLeadEmail } from './templates/crm-lead.template';
import type { CrmLeadDto } from '../crm/crm.mapper';
import { renderPasswordResetEmail } from './templates/password-reset.template';
import {
  renderFeedbackEmail,
  renderReportProblemEmail,
  type SupportEmailContext,
} from './templates/support-email.template';
import { renderOrganizationInviteEmail } from './templates/organization-invite.template';
import { renderTrialExpiringEmail } from './templates/trial-expiring.template';
import {
  renderUpgradeRequestEmail,
  type UpgradeRequestEmailContext,
} from './templates/upgrade-request.template';
import { renderWelcomeEmail } from './templates/welcome.template';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly supportTo: string | undefined;
  private readonly registrationsNotifyTo: string | undefined;
  private readonly crmNotifyTo: string | undefined;
  private readonly billingAlertsTo: string | undefined;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('mail.enabled', false);
    const apiKey = this.configService.get<string>('mail.resendApiKey');
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from = this.configService.get<string>(
      'mail.from',
      'SignageWall <onboarding@resend.dev>',
    );
    this.supportTo = this.configService.get<string>('mail.supportTo');
    this.registrationsNotifyTo = this.configService.get<string>(
      'mail.registrationsNotifyTo',
    );
    this.crmNotifyTo =
      this.configService.get<string>('mail.crmNotifyTo') ||
      this.supportTo ||
      this.registrationsNotifyTo;
    this.billingAlertsTo =
      this.configService.get<string>('mail.billingAlertsTo') ??
      this.supportTo ??
      this.registrationsNotifyTo;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.log('Mail sending is disabled (MAIL_ENABLED=false)');
      return;
    }

    if (this.configService.get('nodeEnv') !== 'development' || !this.resend) {
      return;
    }

    const fromEmail = this.extractEmail(this.from);
    if (fromEmail && !fromEmail.endsWith('@resend.dev')) {
      this.logger.warn(
        `MAIL_FROM uses "${fromEmail}" which is not verified in Resend. ` +
          'For local dev use: SignageWall <onboarding@resend.dev>',
      );
    }
  }

  private extractEmail(from: string): string | null {
    const match = from.match(/<([^>]+)>/);
    return match?.[1] ?? (from.includes('@') ? from : null);
  }

  async sendPasswordResetEmail(params: {
    to: string;
    name: string;
    resetUrl: string;
  }): Promise<void> {
    const { subject, html } = renderPasswordResetEmail({
      name: params.name,
      resetUrl: params.resetUrl,
    });

    await this.send({ to: params.to, subject, html });
  }

  async sendEmailVerificationEmail(params: {
    to: string;
    name: string;
    verifyUrl: string;
  }): Promise<void> {
    const { subject, html } = renderEmailVerificationEmail({
      name: params.name,
      verifyUrl: params.verifyUrl,
    });

    await this.send({ to: params.to, subject, html });
  }

  async sendFeedbackEmail(params: {
    context: SupportEmailContext;
    rating: number;
    message: string;
  }): Promise<void> {
    const { subject, html } = renderFeedbackEmail(
      params.context,
      params.rating,
      params.message,
    );

    await this.sendSupportEmail({ subject, html, context: params.context });
  }

  async sendReportProblemEmail(params: {
    context: SupportEmailContext;
    message: string;
  }): Promise<void> {
    const { subject, html } = renderReportProblemEmail(
      params.context,
      params.message,
    );

    await this.sendSupportEmail({ subject, html, context: params.context });
  }

  async sendOrganizationInviteEmail(params: {
    to: string;
    name: string;
    organizationName: string;
    inviteUrl: string;
    isExistingUser: boolean;
  }): Promise<void> {
    const { subject, html } = renderOrganizationInviteEmail({
      name: params.name,
      organizationName: params.organizationName,
      inviteUrl: params.inviteUrl,
      isExistingUser: params.isExistingUser,
    });

    await this.send({ to: params.to, subject, html });
  }

  async sendWelcomeEmail(params: {
    to: string;
    name: string;
    loginUrl: string;
  }): Promise<void> {
    const { subject, html } = renderWelcomeEmail({
      name: params.name,
      loginUrl: params.loginUrl,
    });

    await this.send({ to: params.to, subject, html });
  }

  /** Trial-expiry warning. It throws so a mail outage is retried next sweep. */
  async sendTrialExpiringEmail(params: {
    to: string;
    name: string;
    expiresAt: Date;
    loginUrl: string;
  }): Promise<void> {
    const { subject, html } = renderTrialExpiringEmail({
      name: params.name,
      expiresAt: params.expiresAt,
      upgradeUrl: params.loginUrl,
    });

    await this.send({ to: params.to, subject, html });
  }

  /** Notifies the team that a customer asked for licences (internal). */
  async sendUpgradeRequestEmail(
    context: UpgradeRequestEmailContext,
  ): Promise<void> {
    const to = this.supportTo ?? this.registrationsNotifyTo;

    if (!to) {
      this.logger.warn(
        'MAIL_SUPPORT_TO / MAIL_REGISTRATIONS_NOTIFY_TO not set; skipping ' +
          `upgrade-request notification for ${context.userEmail}`,
      );
      return;
    }

    const { subject, html } = renderUpgradeRequestEmail(context);

    await this.send({ to, subject, html });
  }

  /** Notifies the SignageWall team that a new user registered (internal). */
  async sendNewRegistrationEmail(params: {
    name: string;
    email: string;
    phone: string;
    company?: string;
    viaInvite: boolean;
  }): Promise<void> {
    if (!this.registrationsNotifyTo) {
      this.logger.warn(
        `MAIL_REGISTRATIONS_NOTIFY_TO not set; skipping registration notification for ${params.email}`,
      );
      return;
    }

    const { subject, html } = renderNewRegistrationEmail(params);

    await this.send({ to: this.registrationsNotifyTo, subject, html });
  }

  /** Internal CRM notification. The Mongo lead remains authoritative. */
  async sendCrmLeadEmail(lead: CrmLeadDto): Promise<boolean> {
    const to = this.crmNotifyTo;
    if (!to || !this.enabled || !this.resend) {
      this.logger.warn(
        `CRM notification skipped for lead ${lead.id}; mail delivery is not configured`,
      );
      return false;
    }

    const { subject, html } = renderCrmLeadEmail(lead);
    await this.send({ to, subject, html, replyTo: lead.email });
    return true;
  }

  /** Daily founder-facing digest of manual billing exceptions. */
  async sendBillingAlertEmail(params: {
    items: BillingAlertEmailItem[];
    adminUrl: string;
  }): Promise<void> {
    if (!this.billingAlertsTo) {
      this.logger.warn(
        'MAIL_BILLING_ALERTS_TO / support inbox not set; skipping billing digest',
      );
      return;
    }

    const { subject, html } = renderBillingAlertEmail(params);
    await this.send({ to: this.billingAlertsTo, subject, html });
  }

  private async sendSupportEmail(params: {
    subject: string;
    html: string;
    context: SupportEmailContext;
  }): Promise<void> {
    if (!this.supportTo) {
      this.logger.warn(
        `MAIL_SUPPORT_TO not set. Support email "${params.subject}" ` +
          `(user=${params.context.userEmail}, org=${params.context.organizationId})`,
      );
      return;
    }

    await this.send({
      to: this.supportTo,
      subject: params.subject,
      html: params.html,
    });
  }

  /**
   * Sends a scheduled proof-of-play report to one recipient.
   *
   * Public because the report module owns the schedule and the rendering; the
   * mail service only knows how to put an envelope round it. The attachments
   * are the deliverable — the body is a summary so the recipient knows what
   * they are opening.
   */
  async sendPlaybackReportEmail(params: {
    to: string;
    subject: string;
    html: string;
    attachments: { filename: string; content: Buffer }[];
  }): Promise<void> {
    await this.send(params);
  }

  private async send(params: {
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
    attachments?: { filename: string; content: Buffer }[];
  }): Promise<void> {
    if (!this.enabled) {
      this.logger.warn(
        `Mail disabled. Would send "${params.subject}" to ${params.to}`,
      );
      return;
    }

    if (!this.resend) {
      this.logger.warn(
        `Mail skipped (RESEND_API_KEY not set). Would send "${params.subject}" to ${params.to}`,
      );
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(params.replyTo ? { replyTo: params.replyTo } : {}),
      ...(params.attachments?.length
        ? { attachments: params.attachments }
        : {}),
    });

    if (error) {
      this.logger.error(`Failed to send email to ${params.to}`, error);
      // Resend returns a plain `{ name, message }` object, not an Error, so
      // re-throwing it as-is would give every catch site upstream something
      // with no stack and no `instanceof Error`.
      throw new Error(`${error.name}: ${error.message}`);
    }

    this.logger.log(`Email sent to ${params.to}: "${params.subject}"`);
  }
}
