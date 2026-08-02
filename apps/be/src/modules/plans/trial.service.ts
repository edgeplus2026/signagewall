import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { Model } from 'mongoose';

import { DataDeletionService } from '../data-deletion/data-deletion.service';
import { MailService } from '../mail/mail.service';
import {
  User,
  UserDocument,
  UserPlan,
  UserRole,
} from '../users/schemas/user.schema';
import { PlansService } from './plans.service';

/** How long before expiry the "your trial ends tomorrow" email goes out. */
const WARNING_LEAD_HOURS = 24;

@Injectable()
export class TrialService {
  private readonly logger = new Logger(TrialService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly plansService: PlansService,
    private readonly dataDeletionService: DataDeletionService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Daily trial sweep, an hour before the GDPR deletion sweep so the two never
   * contend for the same account.
   *
   * Warnings are sent before expiries are processed: an account that crosses
   * both thresholds between two runs (a missed run, a clock jump) is still told
   * before it is erased.
   */
  @Cron('0 2 * * *')
  async runTrialSweep(): Promise<{ warned: number; deleted: number }> {
    const warned = await this.sendExpiryWarnings();

    // Erasing accounts that were never actually told is worse than letting a
    // trial run long, so a deployment with mail switched off (or unconfigured)
    // warns loudly and deletes nothing. Fix the mail config and the backlog
    // clears itself on the next run.
    if (!this.mailService.isEnabled()) {
      this.logger.warn(
        'Mail is disabled — skipping trial deletions so no account is erased unwarned',
      );
      return { warned, deleted: 0 };
    }

    const deleted = await this.deleteExpiredTrials();

    if (warned > 0 || deleted > 0) {
      this.logger.log(
        `Trial sweep: ${warned.toString()} warned, ${deleted.toString()} deleted`,
      );
    }

    return { warned, deleted };
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
   * Erases every free account whose 21 days are up, along with the
   * organizations it owns. There is no grace period and no tombstone — the
   * customer was told yesterday, and re-registering starts a clean trial.
   */
  private async deleteExpiredTrials(): Promise<number> {
    const expired = await this.userModel
      .find({
        plan: UserPlan.FREE,
        role: { $ne: UserRole.SUPER_ADMIN },
        trialEndsAt: { $ne: null, $lte: new Date() },
        // Nobody is erased who was not warned first. The warning pass above runs
        // in the same sweep, so an account that expires between two runs is
        // warned today and deleted tomorrow rather than going without notice.
        trialWarningSentAt: { $ne: null },
      })
      .exec();

    let deleted = 0;

    for (const user of expired) {
      const userId = user._id.toString();

      try {
        const entitlement = await this.plansService.resolveForUser(user);

        if (entitlement.isSponsored || entitlement.isSuperAdmin) {
          continue;
        }

        await this.dataDeletionService.purgeTrialAccount(
          userId,
          entitlement.ownedOrganizationIds,
        );
        this.logger.log(`Trial expired — erased account ${userId}`);
        deleted += 1;
      } catch (error) {
        // Leave the row untouched so the next run retries; every delete in the
        // cascade is idempotent.
        this.logger.error(
          `Trial deletion failed for ${userId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return deleted;
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
