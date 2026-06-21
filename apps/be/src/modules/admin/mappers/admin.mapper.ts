import { PaginatedResult } from '../../../common/dto/paginated-result';
import { OrganizationResponseDto } from '../../organizations/mappers/organization.mapper';
import { UserDocument, UserRole } from '../../users/schemas/user.schema';

export interface AdminUserListItemDto {
  id: string;
  name: string;
  email: string;
  provider: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  organizationCount: number;
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
  createdAt: user.createdAt.toISOString(),
});
