import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

import { NormalizeEmail } from '../../../common/decorators/normalize-email.decorator';
import { OrganizationRole } from '../../organizations/schemas/organization-membership.schema';

export class InviteMemberDto {
  @IsString()
  @MinLength(2)
  name: string;

  @NormalizeEmail()
  @IsEmail()
  email: string;

  @IsEnum([
    OrganizationRole.ADMIN,
    OrganizationRole.MEMBER,
    OrganizationRole.VIEWER,
  ])
  role:
    | OrganizationRole.ADMIN
    | OrganizationRole.MEMBER
    | OrganizationRole.VIEWER;
}
