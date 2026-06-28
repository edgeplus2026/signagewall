import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import { renderEmailVerificationEmail } from './templates/email-verification.template';
import { renderNewRegistrationEmail } from './templates/new-registration.template';
import { renderPasswordResetEmail } from './templates/password-reset.template';
import {
  renderFeedbackEmail,
  renderReportProblemEmail,
  type SupportEmailContext,
} from './templates/support-email.template';
import { renderOrganizationInviteEmail } from './templates/organization-invite.template';
import { renderWelcomeEmail } from './templates/welcome.template';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly supportTo: string | undefined;
  private readonly registrationsNotifyTo: string | undefined;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('mail.enabled', false);
    const apiKey = this.configService.get<string>('mail.resendApiKey');
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from = this.configService.get<string>(
      'mail.from',
      'Edge <onboarding@resend.dev>',
    );
    this.supportTo = this.configService.get<string>('mail.supportTo');
    this.registrationsNotifyTo = this.configService.get<string>(
      'mail.registrationsNotifyTo',
    );
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
          'For local dev use: Edge <onboarding@resend.dev>',
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

  /** Notifies the Edge team that a new user registered (internal). */
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

  private async send(params: {
    to: string;
    subject: string;
    html: string;
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
    });

    if (error) {
      this.logger.error(`Failed to send email to ${params.to}`, error);
      throw error;
    }

    this.logger.log(`Email sent to ${params.to}: "${params.subject}"`);
  }
}
