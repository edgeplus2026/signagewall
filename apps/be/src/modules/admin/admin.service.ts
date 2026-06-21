import { Injectable, Logger } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

import { toPaginatedResult } from '../../common/dto/paginated-result';
import { BusinessException } from '../../common/exceptions/business.exception';
import { AuthTokensService } from '../auth/auth.tokens';
import { toOrganizationResponse } from '../organizations/mappers/organization.mapper';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { toUserResponse, UserResponseDto } from '../users/mappers/user.mapper';
import { UserRole } from '../users/schemas/user.schema';
import {
  type AdminUsersSortField,
  UsersRepository,
} from '../users/users.repository';
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

  async getUserDetail(userId: string): Promise<AdminUserDetailDto> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw BusinessException.notFound(this.i18n.t('auth.userNotFound'));
    }

    const userWithPassword = await this.usersRepository.findById(userId, {
      select: ['password'],
    });
    const memberships = await this.organizationsRepository.findByUserId(userId);

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
}
