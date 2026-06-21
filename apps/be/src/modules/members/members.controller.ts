import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiredOrganizationId } from '../../common/decorators/current-organization.decorator';
import { RequireOrgRole } from '../../common/decorators/org-roles.decorator';
import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import {
  ApiCommonErrorResponses,
  ApiOrgScoped,
  ApiSuccessNullResponse,
  ApiSuccessResponse,
  MemberResponseSchema,
} from '../../common/swagger';
import type { RequestUser } from '../../common/interfaces/request-user.interface';
import { OrganizationRole } from '../organizations/schemas/organization-membership.schema';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MembersService } from './members.service';

@ApiTags('members')
@ApiOrgScoped()
@ApiCommonErrorResponses()
@Controller('members')
@UseGuards(OrgMembershipGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @RequireOrgRole()
  @ApiSuccessResponse(MemberResponseSchema, { isArray: true })
  list(
    @CurrentUser() user: RequestUser,
    @RequiredOrganizationId() organizationId: string,
  ) {
    return this.membersService.list(user.id, organizationId);
  }

  @Post('invite')
  @RequireOrgRole({ roles: [OrganizationRole.ADMIN] })
  @ApiSuccessResponse(MemberResponseSchema)
  invite(
    @CurrentUser() user: RequestUser,
    @RequiredOrganizationId() organizationId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.membersService.invite(user.id, organizationId, dto);
  }

  @Patch(':id')
  @RequireOrgRole({ roles: [OrganizationRole.ADMIN] })
  @ApiSuccessResponse(MemberResponseSchema)
  update(
    @CurrentUser() user: RequestUser,
    @RequiredOrganizationId() organizationId: string,
    @Param('id') memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.update(user.id, organizationId, memberId, dto);
  }

  @Delete(':id')
  @RequireOrgRole({ roles: [OrganizationRole.ADMIN] })
  @ApiSuccessNullResponse()
  async remove(
    @CurrentUser() user: RequestUser,
    @RequiredOrganizationId() organizationId: string,
    @Param('id') memberId: string,
  ) {
    await this.membersService.remove(user.id, organizationId, memberId);
    return null;
  }
}
