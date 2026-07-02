import { Body, Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentOrganizationId } from '../../common/decorators/current-organization.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  AccountSettingsSchema,
  ApiBearerAuthRequired,
  ApiCommonErrorResponses,
  ApiOrgScopedOptionalHeader,
  ApiSuccessNullResponse,
  ApiSuccessResponse,
  UserResponseSchema,
} from '../../common/swagger';
import type { RequestUser } from '../../common/interfaces/request-user.interface';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { FeedbackDto } from './dto/feedback.dto';
import { ReportProblemDto } from './dto/report-problem.dto';
import { UpdateAccountSettingsDto } from './dto/update-account-settings.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@ApiBearerAuthRequired()
@ApiCommonErrorResponses()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Patch('profile')
  @ApiSuccessResponse(UserResponseSchema)
  updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.settingsService.updateProfile(user.id, dto);
  }

  @Post('change-password')
  @ApiSuccessNullResponse()
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.settingsService.changePassword(user.id, dto);
    return null;
  }

  @Post('set-password')
  @ApiSuccessNullResponse()
  async setPassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: SetPasswordDto,
  ) {
    await this.settingsService.setPassword(user.id, dto);
    return null;
  }

  @Get()
  @ApiSuccessResponse(AccountSettingsSchema)
  getSettings(@CurrentUser() user: RequestUser) {
    return this.settingsService.getSettings(user.id);
  }

  @Patch()
  @ApiSuccessResponse(AccountSettingsSchema)
  updateSettings(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateAccountSettingsDto,
  ) {
    return this.settingsService.updateSettings(user.id, dto);
  }

  /** GDPR right of access: download all personal data we hold about the user. */
  @Get('data-export')
  exportData(@CurrentUser() user: RequestUser) {
    return this.settingsService.exportUserData(user.id);
  }

  @Delete()
  deleteAccount(@CurrentUser() user: RequestUser) {
    return this.settingsService.deleteAccount(user.id);
  }

  @Post('feedback')
  @ApiOrgScopedOptionalHeader()
  @ApiSuccessNullResponse()
  async submitFeedback(
    @CurrentUser() user: RequestUser,
    @CurrentOrganizationId() organizationId: string | undefined,
    @Body() dto: FeedbackDto,
  ) {
    await this.settingsService.submitFeedback(user, organizationId, dto);
    return null;
  }

  @Post('report-problem')
  @ApiOrgScopedOptionalHeader()
  @ApiSuccessNullResponse()
  async reportProblem(
    @CurrentUser() user: RequestUser,
    @CurrentOrganizationId() organizationId: string | undefined,
    @Body() dto: ReportProblemDto,
  ) {
    await this.settingsService.reportProblem(user, organizationId, dto);
    return null;
  }
}
