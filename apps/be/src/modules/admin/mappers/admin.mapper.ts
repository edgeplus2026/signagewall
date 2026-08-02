import { PaginatedResult } from '../../../common/dto/paginated-result';
import { OrganizationResponseDto } from '../../organizations/mappers/organization.mapper';
import {
  FREE_SCREEN_LIMIT,
  UserDocument,
  UserPlan,
  UserRole,
} from '../../users/schemas/user.schema';

export interface AdminUserListItemDto {
  id: string;
  name: string;
  email: string;
  provider: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  organizationCount: number;
  plan: UserPlan;
  screenLimit: number;
  trialEndsAt: string | null;
  createdAt: string;
}

export interface AdminUserDetailDto {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  provider: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  hasPassword: boolean;
  plan: UserPlan;
  screenLimit: number;
  screensUsed: number;
  trialEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
  organizations: OrganizationResponseDto[];
}

export type PaginatedAdminUsersDto = PaginatedResult<AdminUserListItemDto>;

export const toAdminUserListItem = (
  user: UserDocument,
  organizationCount: number,
): AdminUserListItemDto => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  provider: user.provider,
  isActive: user.isActive,
  isSuperAdmin: user.role === UserRole.SUPER_ADMIN,
  organizationCount,
  // Accounts predating plans have no stored values; report them as what the
  // schema defaults would give a new account rather than as `undefined`.
  plan: user.plan ?? UserPlan.FREE,
  screenLimit: user.screenLimit ?? FREE_SCREEN_LIMIT,
  trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
  createdAt: user.createdAt.toISOString(),
});
