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

import { CurrentMembership } from '../../common/decorators/current-membership.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireOrgRole } from '../../common/decorators/org-roles.decorator';
import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import {
  ApiBearerAuthRequired,
  ApiCommonErrorResponses,
  ApiSuccessNullResponse,
  ApiSuccessResponse,
  OrganizationResponseSchema,
} from '../../common/swagger';
import type { RequestUser } from '../../common/interfaces/request-user.interface';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrgAlertSettingsDto } from './dto/update-org-alert-settings.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';
import type { OrganizationMembershipDocument } from './schemas/organization-membership.schema';
import { OrganizationRole } from './schemas/organization-membership.schema';

@ApiTags('organizations')
@ApiBearerAuthRequired()
@ApiCommonErrorResponses()
@Controller('organizations')
@UseGuards(OrgMembershipGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @ApiSuccessResponse(OrganizationResponseSchema, { isArray: true })
  list(@CurrentUser() user: RequestUser) {
    return this.organizationsService.listForUser(user.id);
  }

  @Post()
  @ApiSuccessResponse(OrganizationResponseSchema)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(user.id, dto);
  }

  @Get(':id/alert-settings')
  @RequireOrgRole({ roles: [OrganizationRole.ADMIN], idParam: 'id' })
  @ApiSuccessResponse(Object)
  getAlertSettings(@Param('id') organizationId: string) {
    return this.organizationsService.getAlertSettings(organizationId);
  }

  @Patch(':id/alert-settings')
  @RequireOrgRole({ roles: [OrganizationRole.ADMIN], idParam: 'id' })
  @ApiSuccessResponse(Object)
  updateAlertSettings(
    @Param('id') organizationId: string,
    @Body() dto: UpdateOrgAlertSettingsDto,
  ) {
    return this.organizationsService.updateAlertSettings(organizationId, dto);
  }

  @Patch(':id')
  @RequireOrgRole({ roles: [OrganizationRole.ADMIN], idParam: 'id' })
  @ApiSuccessResponse(OrganizationResponseSchema)
  update(
    @Param('id') organizationId: string,
    @CurrentMembership() membership: OrganizationMembershipDocument,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(organizationId, membership, dto);
  }

  @Delete(':id')
  @RequireOrgRole({ roles: [OrganizationRole.ADMIN], idParam: 'id' })
  @ApiSuccessNullResponse()
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id') organizationId: string,
  ) {
    await this.organizationsService.delete(user.id, organizationId);
    return null;
  }
}
