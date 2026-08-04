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
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  AdminUpgradeRequestSchema,
  AdminUserDetailSchema,
  AdminUserListItemSchema,
  ApiBearerAuthRequired,
  ApiCommonErrorResponses,
  ApiSuccessNullResponse,
  ApiSuccessResponse,
  AuthResponseSchema,
  PaginatedAdminUpgradeRequestsSchema,
  PaginatedAdminUsersSchema,
} from '../../common/swagger';
import type { RequestUser } from '../../common/interfaces/request-user.interface';
import { AdminService } from './admin.service';
import { ListUpgradeRequestsQueryDto } from './dto/list-upgrade-requests-query.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserPlanDto } from './dto/update-user-plan.dto';
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

  /** Legacy/emergency entitlement override; paid activation normally follows payment. */
  @Patch('users/:id/plan')
  @ApiSuccessResponse(AdminUserListItemSchema)
  updateUserPlan(
    @CurrentUser() user: RequestUser,
    @Param('id') targetUserId: string,
    @Body() dto: UpdateUserPlanDto,
  ) {
    return this.adminService.updateUserPlan(user.id, targetUserId, dto);
  }

  @Get('upgrade-requests')
  @ApiSuccessResponse(PaginatedAdminUpgradeRequestsSchema)
  listUpgradeRequests(@Query() query: ListUpgradeRequestsQueryDto) {
    return this.adminService.listUpgradeRequests(
      query.page,
      query.limit,
      query.status,
    );
  }

  @Post('upgrade-requests/:id/resolve')
  @ApiSuccessResponse(AdminUpgradeRequestSchema)
  resolveUpgradeRequest(
    @CurrentUser() user: RequestUser,
    @Param('id') requestId: string,
  ) {
    return this.adminService.resolveUpgradeRequest(user.id, requestId);
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
