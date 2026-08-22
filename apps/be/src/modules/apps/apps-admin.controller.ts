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
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/interfaces/request-user.interface';
import {
  ApiBearerAuthRequired,
  ApiCommonErrorResponses,
  ApiSuccessResponse,
} from '../../common/swagger';
import { SuperAdminGuard } from '../admin/guards/super-admin.guard';
import { AppsService } from './apps.service';
import { GrantAppDto } from './dto/grant-app.dto';
import { SetAppVisibilityDto } from './dto/set-app-visibility.dto';

/**
 * Super-admin catalog governance. The catalog itself is code-owned — every app
 * manifest is mirrored into it on boot — so there is nothing to add, rename or
 * delete here. The only setting is per-app visibility, plus beta grants.
 */
@ApiTags('admin-apps')
@ApiBearerAuthRequired()
@ApiCommonErrorResponses()
@Controller('admin/apps')
@UseGuards(SuperAdminGuard)
export class AppsAdminController {
  constructor(private readonly appsService: AppsService) {}

  @Get()
  @ApiSuccessResponse(Object, { isArray: true })
  list() {
    return this.appsService.listAll();
  }

  @Get(':id')
  @ApiSuccessResponse(Object)
  getById(@Param('id') id: string) {
    return this.appsService.getApp(id);
  }

  @Patch(':id/visibility')
  @ApiSuccessResponse(Object)
  setVisibility(@Param('id') id: string, @Body() dto: SetAppVisibilityDto) {
    return this.appsService.setPublic(id, dto.isPublic);
  }

  // ----- Beta entitlements: grant a non-public app to a named organization -----

  @Get(':id/grants')
  @ApiSuccessResponse(Object, { isArray: true })
  listGrants(@Param('id') id: string) {
    return this.appsService.listGrants(id);
  }

  @Post(':id/grants')
  @ApiSuccessResponse(Object, { isArray: true })
  grant(
    @Param('id') id: string,
    @Body() dto: GrantAppDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.appsService.grantToOrganization(
      id,
      dto.organizationId,
      user.id,
    );
  }

  @Delete(':id/grants/:organizationId')
  @ApiSuccessResponse(Object, { isArray: true })
  revoke(
    @Param('id') id: string,
    @Param('organizationId', ParseObjectIdPipe) organizationId: string,
  ) {
    return this.appsService.revokeFromOrganization(id, organizationId);
  }
}
