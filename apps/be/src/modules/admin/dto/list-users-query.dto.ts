import { IsIn, IsOptional, IsString } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export const ADMIN_USERS_SORT_FIELDS = [
  'name',
  'createdAt',
  'isActive',
  'organizationCount',
] as const;

export type AdminUsersSortField = (typeof ADMIN_USERS_SORT_FIELDS)[number];

export class ListUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(ADMIN_USERS_SORT_FIELDS)
  sortBy: AdminUsersSortField = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}
