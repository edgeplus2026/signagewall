import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { Model } from 'mongoose';

import { MailService } from '../mail/mail.service';
import {
  User,
  UserDocument,
  UserPlan,
  UserRole,
} from '../users/schemas/user.schema';
import { SchedulerLockService } from '../../common/redis/scheduler-lock.service';
import { PlansService } from './plans.service';

/** How long before expiry the "your trial ends tomorrow" email goes out. */
const WARNING_LEAD_HOURS = 24;

@Injectable()
export class TrialService {
  private readonly logger = new Logger(TrialService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly plansService: PlansService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly lock: SchedulerLockService,
  ) {}

  /**
   * Daily trial sweep. Warnings are best-effort; expiry is safe even if email is
   * unavailable because it never deletes content or changes player playback.
   */
  @Cron('0 2 * * *')
  async runTrialSweep(): Promise<{ warned: number; expired: number }> {
    // Email goes out here, so a duplicated run is a customer receiving the same
    // warning once per API instance. One holder per deployment.
    if (!(await this.lock.isLeader('trial-sweep', 30 * 60_000))) {
      return { warned: 0, expired: 0 };
    }
    const warned = await this.sendExpiryWarnings();
    const expired = await this.markExpiredTrials();

    if (warned > 0 || expired > 0) {
      this.logger.log(
        `Trial sweep: ${warned.toString()} warned, ${expired.toString()} expired`,
      );
    }

    return { warned, expired };
  }

  /** "Your trial ends tomorrow" — once per account, never resent. */
  private async sendExpiryWarnings(): Promise<number> {
    const threshold = new Date(
      Date.now() + WARNING_LEAD_HOURS * 60 * 60 * 1000,
    );

    const candidates = await this.userModel
      .find({
        plan: UserPlan.FREE,
        role: { $ne: UserRole.SUPER_ADMIN },
        isActive: true,
        trialEndsAt: { $ne: null, $lte: threshold },
        trialWarningSentAt: null,
      })
      .exec();

    let warned = 0;

    for (const user of candidates) {
      if (await this.isExempt(user)) {
        continue;
      }

      try {
        await this.mailService.sendTrialExpiringEmail({
          to: user.email,
          name: user.name,
          // Guarded by the query above; kept non-null for the template.
          expiresAt: user.trialEndsAt ?? new Date(),
          loginUrl: this.loginUrl(),
        });
        // Stamped only on success, so a mail outage retries tomorrow rather
        // than silently swallowing the only warning the customer gets.
        await this.userModel
          .updateOne(
            { _id: user._id },
            { $set: { trialWarningSentAt: new Date() } },
          )
          .exec();
        warned += 1;
      } catch (error) {
        this.logger.error(
          `Trial warning email failed for ${user.email}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return warned;
  }

  /**
   * Marks every elapsed free trial once. This deliberately does not deactivate
   * the user, delete content, lower an existing screen count, or touch devices.
   */
  private async markExpiredTrials(): Promise<number> {
    const expired = await this.userModel
      .find({
        plan: UserPlan.FREE,
        role: { $ne: UserRole.SUPER_ADMIN },
        isActive: true,
        trialEndsAt: { $ne: null, $lte: new Date() },
        trialExpiredAt: null,
      })
      .exec();

    let marked = 0;

    for (const user of expired) {
      const userId = user._id.toString();

      try {
        if (await this.isExempt(user)) {
          continue;
        }

        const result = await this.userModel
          .updateOne(
            { _id: user._id, trialExpiredAt: null },
            { $set: { trialExpiredAt: new Date() } },
          )
          .exec();
        if (result.modifiedCount > 0) {
          this.logger.log(`Trial expired — retained account ${userId}`);
          marked += 1;
        }
      } catch (error) {
        this.logger.error(
          `Trial expiry update failed for ${userId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return marked;
  }

  /** Super-admins and members of a paying organization never expire. */
  private async isExempt(user: UserDocument): Promise<boolean> {
    const entitlement = await this.plansService.resolveForUser(user);
    return entitlement.isSponsored || entitlement.isSuperAdmin;
  }

  private loginUrl(): string {
    const frontendUrl = this.configService.getOrThrow<string>('frontendUrl');
    return `${frontendUrl.replace(/\/$/, '')}/login`;
  }
}
