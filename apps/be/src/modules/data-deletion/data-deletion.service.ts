import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { I18nService } from 'nestjs-i18n';

import { BusinessException } from '../../common/exceptions/business.exception';
import { AppConnection } from '../connections/schemas/app-connection.schema';
import { LegalRepository } from '../legal/legal.repository';
import { MediaService } from '../media/media.service';
import {
  PlayerEvents,
  type ScreenContentChangedEvent,
} from '../player/player.events';
import { OrganizationInvitation } from '../members/schemas/organization-invitation.schema';
import {
  OrganizationMembership,
  OrganizationMembershipDocument,
  OrganizationRole,
  normalizeOrganizationRole,
} from '../organizations/schemas/organization-membership.schema';
import { Organization } from '../organizations/schemas/organization.schema';
import { AppInstance } from '../apps/schemas/app-instance.schema';
import { OrgApp } from '../apps/schemas/org-app.schema';
import { Device } from '../player/schemas/device.schema';
import { Playlist } from '../playlists/schemas/playlist.schema';
import { Screen } from '../screens/schemas/screen.schema';
import { TransactionService } from '../../common/services/transaction.service';
import { UsersRepository } from '../users/users.repository';
import {
  PendingDeletion,
  PendingDeletionDocument,
  PendingDeletionType,
} from './schemas/pending-deletion.schema';

/** Days a deletion sits in soft-delete before the sweep physically erases it. */
const GRACE_DAYS = 30;

export interface DeletionBlocker {
  id: string;
  name: string;
}

@Injectable()
export class DataDeletionService {
  private readonly logger = new Logger(DataDeletionService.name);

  constructor(
    @InjectModel(PendingDeletion.name)
    private readonly pendingModel: Model<PendingDeletionDocument>,
    @InjectModel(Organization.name)
    private readonly organizationModel: Model<Organization>,
    @InjectModel(OrganizationMembership.name)
    private readonly membershipModel: Model<OrganizationMembershipDocument>,
    @InjectModel(OrganizationInvitation.name)
    private readonly invitationModel: Model<OrganizationInvitation>,
    @InjectModel(Screen.name) private readonly screenModel: Model<Screen>,
    @InjectModel(Device.name) private readonly deviceModel: Model<Device>,
    @InjectModel(Playlist.name) private readonly playlistModel: Model<Playlist>,
    @InjectModel(AppInstance.name)
    private readonly appInstanceModel: Model<AppInstance>,
    @InjectModel(OrgApp.name) private readonly orgAppModel: Model<OrgApp>,
    @InjectModel(AppConnection.name)
    private readonly appConnectionModel: Model<AppConnection>,
    private readonly mediaService: MediaService,
    private readonly usersRepository: UsersRepository,
    private readonly legalRepository: LegalRepository,
    private readonly transactionService: TransactionService,
    private readonly eventEmitter: EventEmitter2,
    private readonly i18n: I18nService,
  ) {}

  // --- Requests (start the grace period) -------------------------------------

  /**
   * Queue account deletion: block login + revoke sessions now, physically erase
   * (anonymize) after the grace period. Rejected if the user is the sole admin
   * of an org that has other members — they must transfer or delete it first.
   */
  async requestAccountDeletion(
    userId: string,
  ): Promise<{ scheduledFor: string }> {
    const blockers = await this.findAccountDeletionBlockers(userId);
    if (blockers.length > 0) {
      throw BusinessException.badRequest(
        this.i18n.t('gdpr.accountDeletionBlocked'),
        { blockers },
      );
    }

    const scheduledFor = this.graceDate();
    await this.usersRepository.deactivate(userId);
    await this.upsertPending('account', userId, userId, scheduledFor);
    return { scheduledFor: scheduledFor.toISOString() };
  }

  /** Queue org deletion: hide it now (soft-delete), cascade-erase after grace. */
  async requestOrgDeletion(
    organizationId: string,
    requestedBy: string,
  ): Promise<{ scheduledFor: string }> {
    const org = await this.organizationModel.findById(organizationId).exec();
    if (!org) {
      throw BusinessException.notFound(this.i18n.t('organizations.notFound'));
    }

    const scheduledFor = this.graceDate();
    await this.organizationModel
      .updateOne({ _id: org._id }, { $set: { deletedAt: new Date() } })
      .exec();
    await this.upsertPending(
      'organization',
      organizationId,
      requestedBy,
      scheduledFor,
    );

    // Blank the org's screens immediately: content resolution now returns an
    // empty snapshot for a soft-deleted org, so re-pushing each screen stops
    // playback right away (devices stay paired for a possible cancel).
    const screens = await this.screenModel
      .find({ organizationId: org._id })
      .select('_id')
      .exec();
    for (const screen of screens) {
      this.eventEmitter.emit(PlayerEvents.ScreenContentChanged, {
        organizationId,
        screenId: screen._id.toString(),
      } satisfies ScreenContentChangedEvent);
    }

    return { scheduledFor: scheduledFor.toISOString() };
  }

  async cancelAccountDeletion(userId: string): Promise<void> {
    await this.usersRepository.reactivate(userId);
    await this.pendingModel
      .deleteOne({
        type: 'account',
        targetId: new Types.ObjectId(userId),
        status: 'pending',
      })
      .exec();
  }

  async cancelOrgDeletion(organizationId: string): Promise<void> {
    await this.organizationModel
      .updateOne(
        { _id: new Types.ObjectId(organizationId) },
        { $set: { deletedAt: null } },
      )
      .exec();
    await this.pendingModel
      .deleteOne({
        type: 'organization',
        targetId: new Types.ObjectId(organizationId),
        status: 'pending',
      })
      .exec();
  }

  // --- Sweep (physical erasure) ----------------------------------------------

  /**
   * Daily sweep: physically erase every deletion whose grace period has elapsed.
   * Each row is independent — a failure leaves it `pending` to retry next run
   * (all deletes are idempotent).
   */
  @Cron('0 3 * * *')
  async runSweep(): Promise<number> {
    const due = await this.pendingModel
      .find({ status: 'pending', scheduledFor: { $lte: new Date() } })
      .exec();

    let processed = 0;
    for (const row of due) {
      try {
        if (row.type === 'organization') {
          await this.purgeOrganization(row.targetId.toString());
        } else {
          await this.purgeAccount(row.targetId.toString());
        }
        row.status = 'done';
        await row.save();
        processed += 1;
      } catch (error) {
        this.logger.error(
          `Deletion sweep failed for ${row.type} ${row.targetId.toString()}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
    return processed;
  }

  // --- Cascade internals -----------------------------------------------------

  /** Full org erasure: all org-scoped Mongo docs + media (Mongo + R2). */
  private async purgeOrganization(organizationId: string): Promise<void> {
    const orgId = new Types.ObjectId(organizationId);

    await this.transactionService.run(async (session) => {
      const filter = { organizationId: orgId };
      const opts = { session };
      // Sequential (a session isn't safe for concurrent ops).
      await this.screenModel.deleteMany(filter, opts).exec();
      await this.deviceModel.deleteMany(filter, opts).exec();
      await this.playlistModel.deleteMany(filter, opts).exec();
      await this.appInstanceModel.deleteMany(filter, opts).exec();
      await this.orgAppModel.deleteMany(filter, opts).exec();
      await this.appConnectionModel.deleteMany(filter, opts).exec();
      await this.membershipModel.deleteMany(filter, opts).exec();
      await this.invitationModel.deleteMany(filter, opts).exec();
      await this.organizationModel.deleteOne({ _id: orgId }, opts).exec();
    });

    // Media + R2 are external/non-transactional; best-effort after the commit.
    await this.mediaService.purgeOrganization(organizationId).catch((error) => {
      this.logger.error(
        `Media purge failed for org ${organizationId}`,
        error instanceof Error ? error.stack : String(error),
      );
    });
  }

  /** Account erasure: cascade solely-owned orgs, drop other memberships, anonymize. */
  private async purgeAccount(userId: string): Promise<void> {
    const memberships = await this.membershipModel
      .find({ userId: new Types.ObjectId(userId) })
      .exec();

    for (const membership of memberships) {
      const orgId = membership.organizationId.toString();
      const memberCount = await this.membershipModel
        .countDocuments({ organizationId: membership.organizationId })
        .exec();

      if (memberCount <= 1) {
        await this.purgeOrganization(orgId);
      } else {
        await this.membershipModel.deleteOne({ _id: membership._id }).exec();
      }
    }

    // Erase the user's legal-acceptance records too — they carry the user id +
    // IP (personal data). Proof-of-consent is discarded on erasure by design.
    await this.legalRepository.deleteByUser(userId);
    await this.usersRepository.anonymize(userId);
  }

  /**
   * Orgs that block this user's account deletion: ones where they are the sole
   * admin but other members remain (deleting would orphan the org).
   */
  private async findAccountDeletionBlockers(
    userId: string,
  ): Promise<DeletionBlocker[]> {
    const memberships = await this.membershipModel
      .find({ userId: new Types.ObjectId(userId) })
      .exec();

    const blockers: DeletionBlocker[] = [];
    for (const membership of memberships) {
      if (normalizeOrganizationRole(membership.role) !== OrganizationRole.ADMIN) {
        continue;
      }
      const orgId = membership.organizationId;
      const [memberCount, adminCount, org] = await Promise.all([
        this.membershipModel.countDocuments({ organizationId: orgId }).exec(),
        this.membershipModel
          .countDocuments({
            organizationId: orgId,
            role: { $in: [OrganizationRole.ADMIN, OrganizationRole.OWNER] },
          })
          .exec(),
        this.organizationModel.findById(orgId).exec(),
      ]);

      if (memberCount > 1 && adminCount <= 1 && org) {
        blockers.push({ id: orgId.toString(), name: org.name });
      }
    }
    return blockers;
  }

  // --- Helpers ---------------------------------------------------------------

  private graceDate(): Date {
    return new Date(Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000);
  }

  private async upsertPending(
    type: PendingDeletionType,
    targetId: string,
    requestedBy: string,
    scheduledFor: Date,
    session?: ClientSession,
  ): Promise<void> {
    await this.pendingModel
      .updateOne(
        { type, targetId: new Types.ObjectId(targetId), status: 'pending' },
        {
          $setOnInsert: {
            type,
            targetId: new Types.ObjectId(targetId),
            requestedBy: new Types.ObjectId(requestedBy),
            scheduledFor,
            status: 'pending',
          },
        },
        { upsert: true, session },
      )
      .exec();
  }
}
