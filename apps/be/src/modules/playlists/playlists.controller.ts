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
import { AddPlaylistAppsDto } from './dto/add-playlist-apps.dto';
import { AddPlaylistMediaDto } from './dto/add-playlist-media.dto';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { DeletePlaylistsDto } from './dto/delete-playlists.dto';
import { DuplicatePlaylistDto } from './dto/duplicate-playlist.dto';
import { ReplacePlaylistItemsDto } from './dto/replace-playlist-items.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { PlaylistsService } from './playlists.service';

@ApiTags('playlists')
@ApiOrgScoped()
@ApiCommonErrorResponses()
@Controller('playlists')
@UseGuards(OrgMembershipGuard)
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Get()
  @RequireOrgRole()
  @ApiSuccessResponse(Object, { isArray: true })
  list(@RequiredOrganizationId() organizationId: string) {
    return this.playlistsService.list(organizationId);
  }

  @Post()
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  create(
    @RequiredOrganizationId() organizationId: string,
    @Body() dto: CreatePlaylistDto,
  ) {
    return this.playlistsService.create(organizationId, dto);
  }

  @Post('delete')
  @RequireOrgRole()
  @ApiSuccessNullResponse()
  async deleteMany(
    @RequiredOrganizationId() organizationId: string,
    @Body() dto: DeletePlaylistsDto,
  ): Promise<null> {
    await this.playlistsService.deleteMany(organizationId, dto.ids);
    return null;
  }

  @Post('add-media')
  @RequireOrgRole()
  @ApiSuccessNullResponse()
  async addMedia(
    @RequiredOrganizationId() organizationId: string,
    @Body() dto: AddPlaylistMediaDto,
  ): Promise<null> {
    await this.playlistsService.addMedia(organizationId, dto);
    return null;
  }

  @Post('add-apps')
  @RequireOrgRole()
  @ApiSuccessNullResponse()
  async addApps(
    @RequiredOrganizationId() organizationId: string,
    @Body() dto: AddPlaylistAppsDto,
  ): Promise<null> {
    await this.playlistsService.addApps(organizationId, dto);
    return null;
  }

  @Get(':id/items')
  @RequireOrgRole()
  @ApiSuccessResponse(Object, { isArray: true })
  getItems(
    @RequiredOrganizationId() organizationId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.playlistsService.getItems(organizationId, id);
  }

  @Get(':id/screens')
  @RequireOrgRole()
  @ApiSuccessResponse(Object, { isArray: true })
  getScreensUsing(
    @RequiredOrganizationId() organizationId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.playlistsService.getScreensUsing(organizationId, id);
  }

  @Put(':id/items')
  @RequireOrgRole()
  @ApiSuccessResponse(Object, { isArray: true })
  replaceItems(
    @RequiredOrganizationId() organizationId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: ReplacePlaylistItemsDto,
  ) {
    return this.playlistsService.replaceItems(organizationId, id, dto);
  }

  @Post(':id/duplicate')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  duplicate(
    @RequiredOrganizationId() organizationId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: DuplicatePlaylistDto,
  ) {
    return this.playlistsService.duplicate(organizationId, id, dto);
  }

  @Get(':id')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  getById(
    @RequiredOrganizationId() organizationId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.playlistsService.getById(organizationId, id);
  }

  @Patch(':id')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  update(
    @RequiredOrganizationId() organizationId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdatePlaylistDto,
  ) {
    return this.playlistsService.update(organizationId, id, dto);
  }
}
