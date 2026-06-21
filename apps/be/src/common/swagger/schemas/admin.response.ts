import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { OrganizationResponseSchema } from './organization.response';

export class AdminUserListItemSchema {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  provider: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isSuperAdmin: boolean;

  @ApiProperty()
  organizationCount: number;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;
}

export class AdminUserDetailSchema {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  company?: string;

  @ApiProperty()
  provider: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isSuperAdmin: boolean;

  @ApiProperty()
  hasPassword: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt: string;

  @ApiProperty({ type: [OrganizationResponseSchema] })
  organizations: OrganizationResponseSchema[];
}

export class PaginatedAdminUsersSchema {
  @ApiProperty({ type: [AdminUserListItemSchema] })
  items: AdminUserListItemSchema[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
