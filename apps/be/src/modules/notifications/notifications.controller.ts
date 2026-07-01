import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import type { RequestUser } from '../../common/interfaces/request-user.interface';
import {
  ApiBearerAuthRequired,
  ApiCommonErrorResponses,
  ApiSuccessNullResponse,
  ApiSuccessResponse,
  PaginatedNotificationsSchema,
  UnreadCountSchema,
} from '../../common/swagger';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuthRequired()
@ApiCommonErrorResponses()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiSuccessResponse(PaginatedNotificationsSchema)
  list(
    @CurrentUser() user: RequestUser,
    @I18nLang() lang: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.notificationsService.listForUser(
      user,
      lang,
      query.page,
      query.limit,
    );
  }

  @Get('unread-count')
  @ApiSuccessResponse(UnreadCountSchema)
  unreadCount(@CurrentUser() user: RequestUser) {
    return this.notificationsService.unreadCount(user);
  }

  @Post('read-all')
  @ApiSuccessNullResponse()
  async markAllRead(@CurrentUser() user: RequestUser) {
    await this.notificationsService.markAllRead(user);
    return null;
  }

  @Post(':id/read')
  @ApiSuccessNullResponse()
  async markRead(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    await this.notificationsService.markRead(user, id);
    return null;
  }
}
