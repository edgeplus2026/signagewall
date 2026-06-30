import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/interfaces/request-user.interface';
import {
  AdminNotificationResponseSchema,
  ApiBearerAuthRequired,
  ApiCommonErrorResponses,
  ApiSuccessNullResponse,
  ApiSuccessResponse,
  PaginatedAdminNotificationsSchema,
} from '../../common/swagger';
import { SuperAdminGuard } from '../admin/guards/super-admin.guard';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { PublishNotificationDto } from './dto/publish-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('admin-notifications')
@ApiBearerAuthRequired()
@ApiCommonErrorResponses()
@Controller('admin/notifications')
@UseGuards(SuperAdminGuard)
export class NotificationsAdminController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiSuccessResponse(PaginatedAdminNotificationsSchema)
  list(@Query() query: ListNotificationsQueryDto) {
    return this.notificationsService.listAdmin(
      query.page,
      query.limit,
      query.status,
    );
  }

  @Get(':id')
  @ApiSuccessResponse(AdminNotificationResponseSchema)
  get(@Param('id', ParseObjectIdPipe) id: string) {
    return this.notificationsService.getAdmin(id);
  }

  @Post()
  @ApiSuccessResponse(AdminNotificationResponseSchema)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiSuccessResponse(AdminNotificationResponseSchema)
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateNotificationDto,
  ) {
    return this.notificationsService.update(id, dto);
  }

  @Post(':id/publish')
  @ApiSuccessResponse(AdminNotificationResponseSchema)
  publish(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: PublishNotificationDto,
  ) {
    return this.notificationsService.publish(id, dto);
  }

  @Post(':id/unpublish')
  @ApiSuccessResponse(AdminNotificationResponseSchema)
  unpublish(@Param('id', ParseObjectIdPipe) id: string) {
    return this.notificationsService.unpublish(id);
  }

  @Delete(':id')
  @ApiSuccessNullResponse()
  async remove(@Param('id', ParseObjectIdPipe) id: string) {
    await this.notificationsService.remove(id);
    return null;
  }
}
