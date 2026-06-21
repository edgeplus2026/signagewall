import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiredOrganizationId } from '../../common/decorators/current-organization.decorator';
import { RequireOrgRole } from '../../common/decorators/org-roles.decorator';
import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import type { RequestUser } from '../../common/interfaces/request-user.interface';
import {
  ApiCommonErrorResponses,
  ApiOrgScoped,
  ApiSuccessNullResponse,
  ApiSuccessResponse,
} from '../../common/swagger';
import { AppsService } from './apps.service';

/** Organization-facing catalog browse + install. */
@ApiTags('apps')
@ApiOrgScoped()
@ApiCommonErrorResponses()
@Controller('apps')
@UseGuards(OrgMembershipGuard)
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  @Get()
  @RequireOrgRole()
  @ApiSuccessResponse(Object, { isArray: true })
  list(@RequiredOrganizationId() organizationId: string) {
    return this.appsService.listCatalog(organizationId);
  }

  @Get(':id')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  getById(
    @RequiredOrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.appsService.getCatalogApp(organizationId, id);
  }

  @Post(':id/install')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  install(
    @RequiredOrganizationId() organizationId: string,
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.appsService.install(organizationId, id, user.id);
  }

  @Delete(':id/install')
  @RequireOrgRole()
  @ApiSuccessNullResponse()
  async uninstall(
    @RequiredOrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<null> {
    await this.appsService.uninstall(organizationId, id);
    return null;
  }
}
