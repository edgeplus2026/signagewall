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

import {
  ApiBearerAuthRequired,
  ApiCommonErrorResponses,
  ApiSuccessNullResponse,
  ApiSuccessResponse,
} from '../../common/swagger';
import { SuperAdminGuard } from '../admin/guards/super-admin.guard';
import { AppsService } from './apps.service';
import { CreateAppDto } from './dto/create-app.dto';
import { SetAppVisibilityDto } from './dto/set-app-visibility.dto';
import { UpdateAppDto } from './dto/update-app.dto';

/** Super-admin catalog management. */
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

  @Get('manifests')
  @ApiSuccessResponse(Object, { isArray: true })
  manifests() {
    return this.appsService.listAvailableManifests();
  }

  @Get(':id')
  @ApiSuccessResponse(Object)
  getById(@Param('id') id: string) {
    return this.appsService.getApp(id);
  }

  @Post()
  @ApiSuccessResponse(Object)
  create(@Body() dto: CreateAppDto) {
    return this.appsService.create(dto);
  }

  @Patch(':id')
  @ApiSuccessResponse(Object)
  update(@Param('id') id: string, @Body() dto: UpdateAppDto) {
    return this.appsService.update(id, dto);
  }

  @Patch(':id/visibility')
  @ApiSuccessResponse(Object)
  setVisibility(@Param('id') id: string, @Body() dto: SetAppVisibilityDto) {
    return this.appsService.setPublic(id, dto.isPublic);
  }

  @Delete(':id')
  @ApiSuccessNullResponse()
  async remove(@Param('id') id: string): Promise<null> {
    await this.appsService.remove(id);
    return null;
  }
}
