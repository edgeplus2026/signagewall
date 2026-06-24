import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
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
import { AssignScreensDto } from './dto/assign-screens.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { DeleteSchedulesDto } from './dto/delete-schedules.dto';
import { ReplaceScheduleEventsDto } from './dto/replace-schedule-events.dto';
import { ResolveQueryDto } from './dto/resolve-query.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { SchedulesService } from './schedules.service';

@ApiTags('schedules')
@ApiOrgScoped()
@ApiCommonErrorResponses()
@Controller('schedules')
@UseGuards(OrgMembershipGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  @RequireOrgRole()
  @ApiSuccessResponse(Object, { isArray: true })
  list(@RequiredOrganizationId() organizationId: string) {
    return this.schedulesService.list(organizationId);
  }

  @Post()
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  create(
    @RequiredOrganizationId() organizationId: string,
    @Body() dto: CreateScheduleDto,
  ) {
    return this.schedulesService.create(organizationId, dto);
  }

  @Post('delete')
  @RequireOrgRole()
  @ApiSuccessNullResponse()
  async deleteMany(
    @RequiredOrganizationId() organizationId: string,
    @Body() dto: DeleteSchedulesDto,
  ): Promise<null> {
    await this.schedulesService.deleteMany(organizationId, dto.ids);
    return null;
  }

  @Get('resolve-for-screen/:screenId')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  resolveForScreen(
    @RequiredOrganizationId() organizationId: string,
    @Param('screenId', ParseObjectIdPipe) screenId: string,
    @Query() query: ResolveQueryDto,
  ) {
    return this.schedulesService.resolveForScreen(
      organizationId,
      screenId,
      query,
    );
  }

  @Get(':id/events')
  @RequireOrgRole()
  @ApiSuccessResponse(Object, { isArray: true })
  getEvents(
    @RequiredOrganizationId() organizationId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.schedulesService.getEvents(organizationId, id);
  }

  @Put(':id/events')
  @RequireOrgRole()
  @ApiSuccessResponse(Object, { isArray: true })
  replaceEvents(
    @RequiredOrganizationId() organizationId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: ReplaceScheduleEventsDto,
  ) {
    return this.schedulesService.replaceEvents(organizationId, id, dto);
  }

  @Get(':id/screens')
  @RequireOrgRole()
  @ApiSuccessResponse(Object, { isArray: true })
  getAssignedScreens(
    @RequiredOrganizationId() organizationId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.schedulesService.getAssignedScreens(organizationId, id);
  }

  @Put(':id/screens')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  assignScreens(
    @RequiredOrganizationId() organizationId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: AssignScreensDto,
  ) {
    return this.schedulesService.assignScreens(organizationId, id, dto.screenIds);
  }

  @Get(':id/resolve')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  resolve(
    @RequiredOrganizationId() organizationId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Query() query: ResolveQueryDto,
  ) {
    return this.schedulesService.resolveForSchedule(organizationId, id, query);
  }

  @Get(':id')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  getById(
    @RequiredOrganizationId() organizationId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.schedulesService.getById(organizationId, id);
  }

  @Patch(':id')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  update(
    @RequiredOrganizationId() organizationId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(organizationId, id, dto);
  }
}
