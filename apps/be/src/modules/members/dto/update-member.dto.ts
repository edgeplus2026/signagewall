import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

import { OrganizationRole } from '../../organizations/schemas/organization-membership.schema';

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEnum([OrganizationRole.ADMIN, OrganizationRole.MEMBER])
  role?: OrganizationRole.ADMIN | OrganizationRole.MEMBER;
}
