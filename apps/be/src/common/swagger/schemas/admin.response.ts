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

  @ApiProperty({ enum: ['free', 'enterprise'] })
  plan: string;

  @ApiProperty()
  screenLimit: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  trialEndsAt: string | null;

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

  @ApiProperty({ enum: ['free', 'enterprise'] })
  plan: string;

  @ApiProperty()
  screenLimit: number;

  @ApiProperty()
  screensUsed: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  trialEndsAt: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt: string;

  @ApiProperty({ type: [OrganizationResponseSchema] })
  organizations: OrganizationResponseSchema[];
}

export class AdminUpgradeRequestSchema {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  userName: string;

  @ApiProperty()
  userEmail: string;

  @ApiProperty({ enum: ['free', 'enterprise'] })
  planAtRequest: string;

  @ApiProperty()
  screenLimitAtRequest: number;

  @ApiProperty()
  requestedScreens: number;

  @ApiPropertyOptional()
  message?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  company?: string;

  @ApiProperty({ enum: ['open', 'resolved'] })
  status: string;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  resolvedAt: string | null;
}

export class PaginatedAdminUpgradeRequestsSchema {
  @ApiProperty({ type: [AdminUpgradeRequestSchema] })
  items: AdminUpgradeRequestSchema[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
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
