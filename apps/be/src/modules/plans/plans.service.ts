import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { I18nService } from 'nestjs-i18n';

import { BusinessException } from '../../common/exceptions/business.exception';
import { MailService } from '../mail/mail.service';
import {
  OrganizationMembership,
  OrganizationMembershipDocument,
  OrganizationRole,
} from '../organizations/schemas/organization-membership.schema';
import {
  Organization,
  OrganizationDocument,
} from '../organizations/schemas/organization.schema';
import { Screen } from '../screens/schemas/screen.schema';
import {
  FREE_SCREEN_LIMIT,
  UserDocument,
  UserPlan,
  UserRole,
} from '../users/schemas/user.schema';
import { UsersRepository } from '../users/users.repository';
import { CreateUpgradeRequestDto } from './dto/create-upgrade-request.dto';
import { PlanEntitlementDto } from './mappers/plan.mapper';
import { PlansRepository } from './plans.repository';
import { UpgradeRequestDocument } from './schemas/upgrade-request.schema';

/** Organizations a free account may own. Without this the screen cap is a joke. */
export const FREE_ORGANIZATION_LIMIT = 1;

/** Raised when a plan limit blocks an action, so the CMS can open the modal. */
export const PLAN_LIMIT_DETAIL = 'PLAN_LIMIT_REACHED';

export interface PlanLimitDetails {
  reason: typeof PLAN_LIMIT_DETAIL;
  limitOf: 'screens' | 'organizations';
  plan: UserPlan;
  limit: number;
  used: number;
}

/**
 * Everything the plan gate needs about one account, resolved once.
 *
 * `null` limits mean unlimited — only super-admins get those. A *sponsored*
 * account (a member of somebody else's enterprise organization) reports that
 * organization's plan: they are covered by a paying customer, so they never see
 * an upgrade prompt and the trial sweep never touches them.
 */
export interface ResolvedEntitlement {
  userId: string;
  plan: UserPlan;
  screenLimit: number | null;
  screensUsed: number;
  organizationLimit: number | null;
  organizationsUsed: number;
  trialEndsAt: Date | null;
  ownedOrganizationIds: string[];
  isSponsored: boolean;
  isSuperAdmin: boolean;
}

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    @InjectModel(Organization.name)
    private readonly organizationModel: Model<OrganizationDocument>,
    @InjectModel(OrganizationMembership.name)
    private readonly membershipModel: Model<OrganizationMembershipDocument>,
    @InjectModel(Screen.name) private readonly screenModel: Model<Screen>,
    private readonly plansRepository: PlansRepository,
    private readonly usersRepository: UsersRepository,
    private readonly mailService: MailService,
    private readonly i18n: I18nService,
  ) {}

  // --- Entitlement -----------------------------------------------------------

  async getEntitlement(userId: string): Promise<ResolvedEntitlement> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw BusinessException.notFound(this.i18n.t('auth.userNotFound'));
    }

    return this.resolveForUser(user);
  }

  async resolveForUser(user: UserDocument): Promise<ResolvedEntitlement> {
    const userId = user._id.toString();
    const ownedOrganizations = await this.findOwnedOrganizationIds(userId);
    const screensUsed = await this.countScreens(ownedOrganizations);

    if (user.role === UserRole.SUPER_ADMIN) {
      return {
        userId,
        plan: UserPlan.ENTERPRISE,
        screenLimit: null,
        screensUsed,
        organizationLimit: null,
        organizationsUsed: ownedOrganizations.length,
        trialEndsAt: null,
        ownedOrganizationIds: ownedOrganizations.map((id) => id.toString()),
        isSponsored: false,
        isSuperAdmin: true,
      };
    }

    // A colleague invited into a paying organization is covered by it. Checked
    // before the user's own plan so an expired-looking free account that is
    // really somebody's teammate is never prompted, and never swept.
    const sponsor = await this.findEnterpriseSponsor(userId);

    if (sponsor) {
      return {
        userId,
        plan: UserPlan.ENTERPRISE,
        screenLimit: sponsor.screenLimit,
        screensUsed,
        organizationLimit: null,
        organizationsUsed: ownedOrganizations.length,
        trialEndsAt: null,
        ownedOrganizationIds: ownedOrganizations.map((id) => id.toString()),
        isSponsored: true,
        isSuperAdmin: false,
      };
    }

    const isFree = user.plan !== UserPlan.ENTERPRISE;

    return {
      userId,
      plan: isFree ? UserPlan.FREE : UserPlan.ENTERPRISE,
      screenLimit: user.screenLimit ?? FREE_SCREEN_LIMIT,
      screensUsed,
      organizationLimit: isFree ? FREE_ORGANIZATION_LIMIT : null,
      organizationsUsed: ownedOrganizations.length,
      trialEndsAt: isFree ? (user.trialEndsAt ?? null) : null,
      ownedOrganizationIds: ownedOrganizations.map((id) => id.toString()),
      isSponsored: false,
      isSuperAdmin: false,
    };
  }

  /** The `GET /plans/me` payload — what the CMS header renders from. */
  async getEntitlementResponse(userId: string): Promise<PlanEntitlementDto> {
    const entitlement = await this.getEntitlement(userId);
    const openRequest = entitlement.isSponsored
      ? null
      : await this.plansRepository.findOpenRequestForUser(userId);

    return {
      plan: entitlement.plan,
      screenLimit: entitlement.screenLimit,
      screensUsed: entitlement.screensUsed,
      organizationLimit: entitlement.organizationLimit,
      organizationsUsed: entitlement.organizationsUsed,
      canCreateScreen: this.withinLimit(
        entitlement.screensUsed,
        entitlement.screenLimit,
      ),
      canCreateOrganization: this.withinLimit(
        entitlement.organizationsUsed,
        entitlement.organizationLimit,
      ),
      trialEndsAt: entitlement.trialEndsAt?.toISOString() ?? null,
      trialDaysLeft: this.daysUntil(entitlement.trialEndsAt),
      isSponsored: entitlement.isSponsored,
      hasOpenUpgradeRequest: openRequest !== null,
    };
  }

  // --- Gates -----------------------------------------------------------------

  /**
   * Blocks screen number `limit + 1`. Resolved through the organization's owner,
   * so a member creating a screen spends the owner's licences.
   */
  async assertCanCreateScreen(organizationId: string): Promise<void> {
    const ownerId = await this.resolveOwnerUserId(organizationId);
    const owner = ownerId ? await this.usersRepository.findById(ownerId) : null;

    if (!owner) {
      // No owner resolvable — an organization mid-deletion, or one whose owner
      // was erased before ownership could move on. Fail open: refusing every
      // screen for the remaining team is a worse failure than one uncounted
      // screen, and `transferOwnership` keeps this off the normal paths.
      this.logger.warn(
        `No owner resolved for organization ${organizationId}; skipping plan check`,
      );
      return;
    }

    const entitlement = await this.resolveForUser(owner);

    if (this.withinLimit(entitlement.screensUsed, entitlement.screenLimit)) {
      return;
    }

    throw BusinessException.forbidden(
      this.i18n.t(
        entitlement.plan === UserPlan.FREE
          ? 'plans.screenLimitFree'
          : 'plans.screenLimitEnterprise',
        { args: { limit: entitlement.screenLimit } },
      ),
      {
        reason: PLAN_LIMIT_DETAIL,
        limitOf: 'screens',
        plan: entitlement.plan,
        limit: entitlement.screenLimit ?? 0,
        used: entitlement.screensUsed,
      } satisfies PlanLimitDetails,
    );
  }

  /**
   * Free accounts get one organization. Otherwise the one-screen cap is trivially
   * bypassed by creating a second workspace.
   */
  async assertCanCreateOrganization(userId: string): Promise<void> {
    const entitlement = await this.getEntitlement(userId);

    if (
      this.withinLimit(
        entitlement.organizationsUsed,
        entitlement.organizationLimit,
      )
    ) {
      return;
    }

    throw BusinessException.forbidden(
      this.i18n.t('plans.organizationLimitFree', {
        args: { limit: entitlement.organizationLimit },
      }),
      {
        reason: PLAN_LIMIT_DETAIL,
        limitOf: 'organizations',
        plan: entitlement.plan,
        limit: entitlement.organizationLimit ?? 0,
        used: entitlement.organizationsUsed,
      } satisfies PlanLimitDetails,
    );
  }

  // --- Upgrade requests ------------------------------------------------------

  /**
   * Records the "I want N screens" form and notifies the team. Mail is
   * best-effort: the row is the durable record, and the super-admin works from
   * the queue in the CMS, not the inbox.
   */
  async createUpgradeRequest(
    userId: string,
    dto: CreateUpgradeRequestDto,
  ): Promise<UpgradeRequestDocument> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw BusinessException.notFound(this.i18n.t('auth.userNotFound'));
    }

    const entitlement = await this.resolveForUser(user);
    const request = await this.plansRepository.createRequest({
      userId: user._id,
      planAtRequest: entitlement.plan,
      screenLimitAtRequest: entitlement.screenLimit ?? 0,
      requestedScreens: dto.requestedScreens,
      ...(dto.message?.trim() ? { message: dto.message.trim() } : {}),
      ...(dto.phone?.trim() ? { phone: dto.phone.trim() } : {}),
      ...(dto.company?.trim() ? { company: dto.company.trim() } : {}),
    });

    await this.mailService
      .sendUpgradeRequestEmail({
        userName: user.name,
        userEmail: user.email,
        phone: dto.phone?.trim() || user.phone,
        company: dto.company?.trim() || user.company,
        currentPlan: entitlement.plan,
        currentScreenLimit: entitlement.screenLimit,
        screensUsed: entitlement.screensUsed,
        requestedScreens: dto.requestedScreens,
        message: dto.message?.trim(),
      })
      .catch((error: unknown) => {
        this.logger.error(
          `Upgrade-request email failed for ${user.email}`,
          error instanceof Error ? error.stack : String(error),
        );
      });

    return request;
  }

  // --- Owner / sponsor resolution --------------------------------------------

  /**
   * Who pays for an organization. Reads `ownerUserId`; organizations created
   * before plans existed fall back to their earliest admin, which is what the
   * migration backfills from.
   */
  async resolveOwnerUserId(organizationId: string): Promise<string | null> {
    const organization = await this.organizationModel
      .findById(organizationId)
      .select('ownerUserId')
      .exec();

    if (organization?.ownerUserId) {
      return organization.ownerUserId.toString();
    }

    const earliestAdmin = await this.membershipModel
      .findOne({
        organizationId: new Types.ObjectId(organizationId),
        role: { $in: [OrganizationRole.ADMIN, OrganizationRole.OWNER] },
      })
      .sort({ createdAt: 1, _id: 1 })
      .select('userId')
      .exec();

    return earliestAdmin?.userId.toString() ?? null;
  }

  /**
   * An enterprise account that owns an organization this user belongs to but
   * does not own. Their licences cover this user.
   */
  private async findEnterpriseSponsor(
    userId: string,
  ): Promise<UserDocument | null> {
    const memberships = await this.membershipModel
      .find({ userId: new Types.ObjectId(userId) })
      .select('organizationId')
      .exec();

    if (memberships.length === 0) {
      return null;
    }

    const organizations = await this.organizationModel
      .find({
        _id: { $in: memberships.map((m) => m.organizationId) },
        deletedAt: null,
        ownerUserId: { $ne: new Types.ObjectId(userId) },
      })
      .select('ownerUserId')
      .exec();

    const ownerIds = organizations
      .map((organization) => organization.ownerUserId)
      .filter((ownerId): ownerId is Types.ObjectId => Boolean(ownerId));

    for (const ownerId of ownerIds) {
      const owner = await this.usersRepository.findById(ownerId.toString());

      if (
        owner?.plan === UserPlan.ENTERPRISE ||
        owner?.role === UserRole.SUPER_ADMIN
      ) {
        return owner;
      }
    }

    return null;
  }

  private async findOwnedOrganizationIds(
    userId: string,
  ): Promise<Types.ObjectId[]> {
    const owned = await this.organizationModel
      .find({ ownerUserId: new Types.ObjectId(userId), deletedAt: null })
      .select('_id')
      .exec();

    return owned.map((organization) => organization._id);
  }

  private countScreens(organizationIds: Types.ObjectId[]): Promise<number> {
    if (organizationIds.length === 0) {
      return Promise.resolve(0);
    }

    return this.screenModel
      .countDocuments({ organizationId: { $in: organizationIds } })
      .exec();
  }

  // --- Helpers ---------------------------------------------------------------

  private withinLimit(used: number, limit: number | null): boolean {
    return limit === null || used < limit;
  }

  /** Whole days from now until `date`; never negative, `null` if no deadline. */
  private daysUntil(date: Date | null): number | null {
    if (!date) {
      return null;
    }

    const millis = date.getTime() - Date.now();
    return Math.max(0, Math.ceil(millis / (24 * 60 * 60 * 1000)));
  }
}
