import { Injectable, Logger } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

import { toPaginatedResult } from '../../common/dto/paginated-result';
import { BusinessException } from '../../common/exceptions/business.exception';
import { AuthTokensService } from '../auth/auth.tokens';
import { DataDeletionService } from '../data-deletion/data-deletion.service';
import { toOrganizationResponse } from '../organizations/mappers/organization.mapper';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import {
  AdminUpgradeRequestDto,
  PaginatedAdminUpgradeRequestsDto,
  toAdminUpgradeRequest,
} from '../plans/mappers/plan.mapper';
import { PlansRepository } from '../plans/plans.repository';
import { PlansService } from '../plans/plans.service';
import { toUserResponse, UserResponseDto } from '../users/mappers/user.mapper';
import {
  FREE_SCREEN_LIMIT,
  TRIAL_DAYS,
  UserPlan,
  UserRole,
} from '../users/schemas/user.schema';
import {
  type AdminUsersSortField,
  UsersRepository,
} from '../users/users.repository';
import { UpdateUserPlanDto } from './dto/update-user-plan.dto';
import {
  AdminUserDetailDto,
  AdminUserListItemDto,
  PaginatedAdminUsersDto,
  toAdminUserListItem,
} from './mappers/admin.mapper';

export interface ImpersonateResponseDto {
  user: UserResponseDto;
  tokens: import('../auth/auth.tokens').AuthTokens;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly authTokensService: AuthTokensService,
    private readonly dataDeletionService: DataDeletionService,
    private readonly plansRepository: PlansRepository,
    private readonly plansService: PlansService,
    private readonly i18n: I18nService,
  ) {}

  async listUsers(
    page: number,
    limit: number,
    search?: string,
    sortBy?: AdminUsersSortField,
    sortOrder?: 'asc' | 'desc',
  ): Promise<PaginatedAdminUsersDto> {
    const { users, total } = await this.usersRepository.findPaginated({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    });

    const items = await Promise.all(
      users.map(async (user) => {
        const organizationCount =
          await this.organizationsRepository.countByUserId(user._id.toString());

        return toAdminUserListItem(user, organizationCount);
      }),
    );

    return toPaginatedResult(items, total, page, limit);
  }

  async promoteToSuperAdmin(
    adminUserId: string,
    targetUserId: string,
  ): Promise<AdminUserListItemDto> {
    if (adminUserId === targetUserId) {
      throw BusinessException.badRequest(
        this.i18n.t('admin.cannotPromoteSelf'),
      );
    }

    const user = await this.usersRepository.findById(targetUserId);

    if (!user) {
      throw BusinessException.notFound(this.i18n.t('auth.userNotFound'));
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      throw BusinessException.badRequest(
        this.i18n.t('admin.alreadySuperAdmin'),
      );
    }

    const updated = await this.usersRepository.updateById(targetUserId, {
      role: UserRole.SUPER_ADMIN,
    });

    if (!updated) {
      throw BusinessException.notFound(this.i18n.t('auth.userNotFound'));
    }

    const organizationCount =
      await this.organizationsRepository.countByUserId(targetUserId);

    this.logger.log(`User ${targetUserId} promoted to super-admin`);

    return toAdminUserListItem(updated, organizationCount);
  }

  async demoteFromSuperAdmin(
    adminUserId: string,
    targetUserId: string,
  ): Promise<AdminUserListItemDto> {
    if (adminUserId === targetUserId) {
      throw BusinessException.badRequest(this.i18n.t('admin.cannotDemoteSelf'));
    }

    const user = await this.usersRepository.findById(targetUserId);

    if (!user) {
      throw BusinessException.notFound(this.i18n.t('auth.userNotFound'));
    }

    if (user.role !== UserRole.SUPER_ADMIN) {
      throw BusinessException.badRequest(this.i18n.t('admin.notSuperAdmin'));
    }

    const updated = await this.usersRepository.updateById(targetUserId, {
      role: UserRole.USER,
    });

    if (!updated) {
      throw BusinessException.notFound(this.i18n.t('auth.userNotFound'));
    }

    const organizationCount =
      await this.organizationsRepository.countByUserId(targetUserId);

    this.logger.log(`User ${targetUserId} demoted from super-admin`);

    return toAdminUserListItem(updated, organizationCount);
  }

  /**
   * Sets a user's plan and licence count. This is the entire billing system:
   * an invoice is settled out-of-band and a super-admin reflects it here.
   *
   * Moving to enterprise clears the trial clock, so the account stops being a
   * deletion candidate immediately. Moving back to free restarts a full trial
   * rather than expiring the account on the spot — a downgrade should never be
   * one click away from erasing a customer's data.
   *
   * Lowering `screenLimit` below the screens already in use is allowed and does
   * not delete anything: existing screens keep playing, and only the next
   * creation is refused. Live signage must not go dark because of a billing edit.
   */
  async updateUserPlan(
    adminUserId: string,
    targetUserId: string,
    dto: UpdateUserPlanDto,
  ): Promise<AdminUserListItemDto> {
    const user = await this.usersRepository.findById(targetUserId);

    if (!user) {
      throw BusinessException.notFound(this.i18n.t('auth.userNotFound'));
    }

    const isUpgrade = dto.plan === UserPlan.ENTERPRISE;
    const updated = await this.usersRepository.updateById(targetUserId, {
      plan: dto.plan,
      screenLimit: dto.screenLimit,
      ...(isUpgrade
        ? { trialEndsAt: null, trialWarningSentAt: null }
        : // Back to free: a fresh 21 days, and the warning may be sent again.
          { trialEndsAt: this.trialDeadline(), trialWarningSentAt: null }),
    });

    if (!updated) {
      throw BusinessException.notFound(this.i18n.t('auth.userNotFound'));
    }

    if (isUpgrade) {
      await this.plansRepository.resolveOpenForUser(targetUserId, adminUserId);
    }

    const organizationCount =
      await this.organizationsRepository.countByUserId(targetUserId);

    this.logger.log(
      `Super-admin ${adminUserId} set user ${targetUserId} to ` +
        `${dto.plan} with ${dto.screenLimit.toString()} screen(s)`,
    );

    return toAdminUserListItem(updated, organizationCount);
  }

  async listUpgradeRequests(
    page: number,
    limit: number,
    status?: 'open' | 'resolved',
  ): Promise<PaginatedAdminUpgradeRequestsDto> {
    const { requests, total } = await this.plansRepository.findPaginated({
      page,
      limit,
      ...(status ? { status } : {}),
    });

    const items = await Promise.all(
      requests.map(async (request) => {
        const user = await this.usersRepository.findById(
          request.userId.toString(),
        );

        return toAdminUpgradeRequest(request, user);
      }),
    );

    return toPaginatedResult(items, total, page, limit);
  }

  countOpenUpgradeRequests(): Promise<number> {
    return this.plansRepository.countOpen();
  }

  /** Dismisses a request that was handled outside the plan editor. */
  async resolveUpgradeRequest(
    adminUserId: string,
    requestId: string,
  ): Promise<AdminUpgradeRequestDto> {
    const resolved = await this.plansRepository.resolve(requestId, adminUserId);

    if (!resolved) {
      throw BusinessException.notFound(
        this.i18n.t('plans.upgradeRequestNotFound'),
      );
    }

    const user = await this.usersRepository.findById(
      resolved.userId.toString(),
    );

    return toAdminUpgradeRequest(resolved, user);
  }

  private trialDeadline(): Date {
    return new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  }

  async getUserDetail(userId: string): Promise<AdminUserDetailDto> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw BusinessException.notFound(this.i18n.t('auth.userNotFound'));
    }

    const userWithPassword = await this.usersRepository.findById(userId, {
      select: ['password'],
    });
    const memberships = await this.organizationsRepository.findByUserId(userId);
    // Resolved rather than read off the row: it counts screens across every
    // organization the user owns, which is what the licence cap measures.
    const entitlement = await this.plansService.resolveForUser(user);

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      company: user.company,
      provider: user.provider,
      isActive: user.isActive,
      isSuperAdmin: user.role === UserRole.SUPER_ADMIN,
      hasPassword: Boolean(userWithPassword?.password),
      plan: user.plan ?? UserPlan.FREE,
      screenLimit: user.screenLimit ?? FREE_SCREEN_LIMIT,
      screensUsed: entitlement.screensUsed,
      trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      organizations: memberships.map(({ organization, role }) =>
        toOrganizationResponse(organization, role),
      ),
    };
  }

  async impersonate(
    adminUserId: string,
    targetUserId: string,
  ): Promise<ImpersonateResponseDto> {
    if (adminUserId === targetUserId) {
      throw BusinessException.badRequest(
        this.i18n.t('admin.cannotImpersonateSelf'),
      );
    }

    const target = await this.usersRepository.findById(targetUserId);

    if (!target || !target.isActive) {
      throw BusinessException.notFound(this.i18n.t('auth.userNotFound'));
    }

    const userWithPassword = await this.usersRepository.findById(targetUserId, {
      select: ['password'],
    });
    const tokens = await this.authTokensService.generateTokens(
      target._id.toString(),
      target.email,
      { impersonatorId: adminUserId },
    );

    this.logger.log(
      `Super-admin ${adminUserId} started impersonating user ${targetUserId}`,
    );

    return {
      user: toUserResponse(target, Boolean(userWithPassword?.password)),
      tokens,
    };
  }

  /**
   * Permanently deletes a user and cascades all of their data (solely-owned
   * organizations and everything scoped to them, other memberships, legal
   * records), then physically removes the account. Irreversible; no grace
   * period. A super-admin cannot delete their own account this way.
   */
  async deleteUser(adminUserId: string, targetUserId: string): Promise<void> {
    if (adminUserId === targetUserId) {
      throw BusinessException.badRequest(this.i18n.t('admin.cannotDeleteSelf'));
    }

    const user = await this.usersRepository.findById(targetUserId);
    if (!user) {
      throw BusinessException.notFound(this.i18n.t('auth.userNotFound'));
    }

    await this.dataDeletionService.purgeAccountNow(targetUserId);

    this.logger.log(
      `Super-admin ${adminUserId} permanently deleted user ${targetUserId}`,
    );
  }
}
