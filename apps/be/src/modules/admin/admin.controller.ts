import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  AdminUserDetailSchema,
  AdminUserListItemSchema,
  ApiBearerAuthRequired,
  ApiCommonErrorResponses,
  ApiSuccessNullResponse,
  ApiSuccessResponse,
  AuthResponseSchema,
  PaginatedAdminUsersSchema,
} from '../../common/swagger';
import type { RequestUser } from '../../common/interfaces/request-user.interface';
import { AdminService } from './admin.service';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { SuperAdminGuard } from './guards/super-admin.guard';

@ApiTags('admin')
@ApiBearerAuthRequired()
@ApiCommonErrorResponses()
@Controller('admin')
@UseGuards(SuperAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiSuccessResponse(PaginatedAdminUsersSchema)
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.adminService.listUsers(
      query.page,
      query.limit,
      query.search,
      query.sortBy,
      query.sortOrder,
    );
  }

  @Get('users/:id')
  @ApiSuccessResponse(AdminUserDetailSchema)
  getUser(@Param('id') userId: string) {
    return this.adminService.getUserDetail(userId);
  }

  @Post('users/:id/impersonate')
  @ApiSuccessResponse(AuthResponseSchema)
  impersonate(
    @CurrentUser() user: RequestUser,
    @Param('id') targetUserId: string,
  ) {
    return this.adminService.impersonate(user.id, targetUserId);
  }

  @Post('users/:id/promote-super-admin')
  @ApiSuccessResponse(AdminUserListItemSchema)
  promoteSuperAdmin(
    @CurrentUser() user: RequestUser,
    @Param('id') targetUserId: string,
  ) {
    return this.adminService.promoteToSuperAdmin(user.id, targetUserId);
  }

  @Post('users/:id/demote-super-admin')
  @ApiSuccessResponse(AdminUserListItemSchema)
  demoteSuperAdmin(
    @CurrentUser() user: RequestUser,
    @Param('id') targetUserId: string,
  ) {
    return this.adminService.demoteFromSuperAdmin(user.id, targetUserId);
  }

  @Delete('users/:id')
  @ApiSuccessNullResponse()
  async deleteUser(
    @CurrentUser() user: RequestUser,
    @Param('id') targetUserId: string,
  ): Promise<null> {
    await this.adminService.deleteUser(user.id, targetUserId);
    return null;
  }
}
