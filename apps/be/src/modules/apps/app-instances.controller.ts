import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { RequiredOrganizationId } from '../../common/decorators/current-organization.decorator';
import { RequireOrgRole } from '../../common/decorators/org-roles.decorator';
import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import {
  ApiCommonErrorResponses,
  ApiOrgScoped,
  ApiSuccessNullResponse,
  ApiSuccessResponse,
} from '../../common/swagger';
import { AppInstancesService } from './app-instances.service';
import { CreateAppInstanceDto } from './dto/create-app-instance.dto';
import { ListAppInstancesQueryDto } from './dto/list-app-instances-query.dto';
import { RenameAppInstanceDto } from './dto/rename-app-instance.dto';
import { UpdateAppInstanceConfigDto } from './dto/update-app-instance-config.dto';

@ApiTags('app-instances')
@ApiOrgScoped()
@ApiCommonErrorResponses()
@Controller('app-instances')
@UseGuards(OrgMembershipGuard)
export class AppInstancesController {
  constructor(private readonly instancesService: AppInstancesService) {}

  @Get()
  @RequireOrgRole()
  @ApiSuccessResponse(Object, { isArray: true })
  list(
    @RequiredOrganizationId() organizationId: string,
    @Query() query: ListAppInstancesQueryDto,
  ) {
    return this.instancesService.list(organizationId, query.appId);
  }

  @Post()
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  create(
    @RequiredOrganizationId() organizationId: string,
    @Body() dto: CreateAppInstanceDto,
  ) {
    return this.instancesService.create(organizationId, dto.appId, dto.name);
  }

  @Get(':id')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  getById(
    @RequiredOrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.instancesService.getById(organizationId, id);
  }

  @Patch(':id')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  rename(
    @RequiredOrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: RenameAppInstanceDto,
  ) {
    return this.instancesService.rename(organizationId, id, dto.name);
  }

  @Put(':id/config')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  updateConfig(
    @RequiredOrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAppInstanceConfigDto,
  ) {
    return this.instancesService.updateConfig(organizationId, id, dto.config);
  }

  @Delete(':id/connection')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  disconnect(
    @RequiredOrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    // Disconnect the instance's OAuth account: delete the connection and clear
    // `connectionId` so the config form shows the connect prompt again.
    return this.instancesService.disconnect(organizationId, id);
  }

  @Delete(':id')
  @RequireOrgRole()
  @ApiSuccessNullResponse()
  async remove(
    @RequiredOrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<null> {
    await this.instancesService.remove(organizationId, id);
    return null;
  }
}
