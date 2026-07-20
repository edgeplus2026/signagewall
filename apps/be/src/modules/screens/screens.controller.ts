import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
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
import { AddScreenAppsDto } from './dto/add-screen-apps.dto';
import { AddScreenMediaDto } from './dto/add-screen-media.dto';
import { AddScreenPlaylistsDto } from './dto/add-screen-playlists.dto';
import { CreateScreenDto } from './dto/create-screen.dto';
import { DeleteScreensDto } from './dto/delete-screens.dto';
import { ReplaceScreenItemsDto } from './dto/replace-screen-items.dto';
import { UpdateScreenAvailabilityDto } from './dto/update-screen-availability.dto';
import { UpdateScreenDto } from './dto/update-screen.dto';
import { ScreensService } from './screens.service';

@ApiTags('screens')
@ApiOrgScoped()
@ApiCommonErrorResponses()
@Controller('screens')
@UseGuards(OrgMembershipGuard)
export class ScreensController {
  constructor(private readonly screensService: ScreensService) {}

  @Get()
  @RequireOrgRole()
  @ApiSuccessResponse(Object, { isArray: true })
  list(@RequiredOrganizationId() organizationId: string) {
    return this.screensService.list(organizationId);
  }

  @Post()
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  create(
    @RequiredOrganizationId() organizationId: string,
    @Body() dto: CreateScreenDto,
  ) {
    return this.screensService.create(organizationId, dto);
  }

  @Post('delete')
  @RequireOrgRole()
  @ApiSuccessNullResponse()
  async deleteMany(
    @RequiredOrganizationId() organizationId: string,
    @Body() dto: DeleteScreensDto,
  ): Promise<null> {
    await this.screensService.deleteMany(organizationId, dto.ids);
    return null;
  }

  @Post('add-media')
  @RequireOrgRole()
  @ApiSuccessNullResponse()
  async addMedia(
    @RequiredOrganizationId() organizationId: string,
    @Body() dto: AddScreenMediaDto,
  ): Promise<null> {
    await this.screensService.addMedia(organizationId, dto);
    return null;
  }

  @Post('add-playlists')
  @RequireOrgRole()
  @ApiSuccessNullResponse()
  async addPlaylists(
    @RequiredOrganizationId() organizationId: string,
    @Body() dto: AddScreenPlaylistsDto,
  ): Promise<null> {
    await this.screensService.addPlaylists(organizationId, dto);
    return null;
  }

  @Post('add-apps')
  @RequireOrgRole()
  @ApiSuccessNullResponse()
  async addApps(
    @RequiredOrganizationId() organizationId: string,
    @Body() dto: AddScreenAppsDto,
  ): Promise<null> {
    await this.screensService.addApps(organizationId, dto);
    return null;
  }

  @Get(':id/items')
  @RequireOrgRole()
  @ApiSuccessResponse(Object, { isArray: true })
  getItems(
    @RequiredOrganizationId() organizationId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.screensService.getItems(organizationId, id);
  }

  @Put(':id/items')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  replaceItems(
    @RequiredOrganizationId() organizationId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: ReplaceScreenItemsDto,
  ) {
    return this.screensService.replaceItems(organizationId, id, dto);
  }

  @Get(':id/availability')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  getAvailability(
    @RequiredOrganizationId() organizationId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.screensService.getAvailability(organizationId, id);
  }

  @Get(':id/status')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  getStatus(
    @RequiredOrganizationId() organizationId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.screensService.getStatus(organizationId, id);
  }

  @Get(':id')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  getById(
    @RequiredOrganizationId() organizationId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.screensService.getById(organizationId, id);
  }

  @Patch(':id/availability')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  updateAvailability(
    @RequiredOrganizationId() organizationId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateScreenAvailabilityDto,
  ) {
    return this.screensService.updateAvailability(organizationId, id, dto);
  }

  @Patch(':id')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  update(
    @RequiredOrganizationId() organizationId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateScreenDto,
  ) {
    return this.screensService.update(organizationId, id, dto);
  }
}
