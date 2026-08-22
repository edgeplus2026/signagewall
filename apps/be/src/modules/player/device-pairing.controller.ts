import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import { isShellCommand } from '@signagewall/player-contract';

import { BusinessException } from '../../common/exceptions/business.exception';

import { AuthThrottle } from '../../common/decorators/auth-throttle.decorator';
import { RequiredOrganizationId } from '../../common/decorators/current-organization.decorator';
import { RequireOrgRole } from '../../common/decorators/org-roles.decorator';
import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import {
  ApiCommonErrorResponses,
  ApiOrgScoped,
  ApiSuccessNullResponse,
  ApiSuccessResponse,
} from '../../common/swagger';
import { PairDeviceDto } from './dto/pair-device.dto';
import { SetDeviceDailyReloadDto } from './dto/set-device-daily-reload.dto';
import { SetDeviceOrientationDto } from './dto/set-device-orientation.dto';
import { SetDeviceScaleDto } from './dto/set-device-scale.dto';
import { SetDeviceVolumeDto } from './dto/set-device-volume.dto';
import { StepDeviceDto } from './dto/step-device.dto';
import { PlayerMaintenanceGuard } from './guards/player-maintenance.guard';
import { PlayerService } from './player.service';

/**
 * CMS-facing device pairing, scoped to a screen (a screen IS the player). Lives
 * on the `screens` path so the "Device" tab on the screen detail page can pair,
 * inspect, and unpair the bound display.
 */
@ApiTags('screens')
@ApiOrgScoped()
@ApiCommonErrorResponses()
@Controller('screens')
@UseGuards(OrgMembershipGuard)
export class DevicePairingController {
  constructor(private readonly playerService: PlayerService) {}

  @Post(':screenId/pair')
  @RequireOrgRole()
  @AuthThrottle()
  @ApiSuccessResponse(Object)
  pair(
    @RequiredOrganizationId() organizationId: string,
    @Param('screenId', ParseObjectIdPipe) screenId: string,
    @Body() dto: PairDeviceDto,
  ) {
    return this.playerService.pairScreenDevice(
      organizationId,
      screenId,
      dto.code,
    );
  }

  @Get('devices/presence')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  listDevicePresence(@RequiredOrganizationId() organizationId: string) {
    return this.playerService.listScreenDevices(organizationId);
  }

  @Get(':screenId/device')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  getDevice(
    @RequiredOrganizationId() organizationId: string,
    @Param('screenId', ParseObjectIdPipe) screenId: string,
  ) {
    return this.playerService.getScreenDevice(organizationId, screenId);
  }

  @Post(':screenId/device/recovery-link')
  @RequireOrgRole()
  @AuthThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiSuccessResponse(Object)
  createRecoveryLink(
    @RequiredOrganizationId() organizationId: string,
    @Param('screenId', ParseObjectIdPipe) screenId: string,
  ) {
    return this.playerService.createRecoveryLink(organizationId, screenId);
  }

  @Patch(':screenId/device/volume')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  setVolume(
    @RequiredOrganizationId() organizationId: string,
    @Param('screenId', ParseObjectIdPipe) screenId: string,
    @Body() dto: SetDeviceVolumeDto,
  ) {
    return this.playerService.setScreenDeviceVolume(
      organizationId,
      screenId,
      dto.volume,
    );
  }

  @Patch(':screenId/device/orientation')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  setOrientation(
    @RequiredOrganizationId() organizationId: string,
    @Param('screenId', ParseObjectIdPipe) screenId: string,
    @Body() dto: SetDeviceOrientationDto,
  ) {
    return this.playerService.setScreenDeviceOrientation(
      organizationId,
      screenId,
      dto.orientation,
    );
  }

  @Patch(':screenId/device/scale')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  setScale(
    @RequiredOrganizationId() organizationId: string,
    @Param('screenId', ParseObjectIdPipe) screenId: string,
    @Body() dto: SetDeviceScaleDto,
  ) {
    return this.playerService.setScreenDeviceScale(
      organizationId,
      screenId,
      dto.scale,
    );
  }

  @Patch(':screenId/device/daily-reload')
  @RequireOrgRole()
  @UseGuards(PlayerMaintenanceGuard)
  @ApiSuccessResponse(Object)
  setDailyReload(
    @RequiredOrganizationId() organizationId: string,
    @Param('screenId', ParseObjectIdPipe) screenId: string,
    @Body() dto: SetDeviceDailyReloadDto,
  ) {
    return this.playerService.setScreenDeviceDailyReload(
      organizationId,
      screenId,
      { enabled: dto.enabled, time: dto.time },
    );
  }

  @Post(':screenId/device/restart')
  @RequireOrgRole()
  @UseGuards(PlayerMaintenanceGuard)
  @HttpCode(HttpStatus.OK)
  @ApiSuccessNullResponse()
  async restart(
    @RequiredOrganizationId() organizationId: string,
    @Param('screenId', ParseObjectIdPipe) screenId: string,
  ): Promise<null> {
    await this.playerService.restartScreenDevice(organizationId, screenId);
    return null;
  }

  @Post(':screenId/device/diagnostics')
  @RequireOrgRole()
  @UseGuards(PlayerMaintenanceGuard)
  @HttpCode(HttpStatus.OK)
  @ApiSuccessNullResponse()
  async requestDiagnostics(
    @RequiredOrganizationId() organizationId: string,
    @Param('screenId', ParseObjectIdPipe) screenId: string,
  ): Promise<null> {
    await this.playerService.requestDiagnostics(organizationId, screenId);
    return null;
  }

  @Post(':screenId/device/apply-update')
  @RequireOrgRole()
  @UseGuards(PlayerMaintenanceGuard)
  @HttpCode(HttpStatus.OK)
  @ApiSuccessNullResponse()
  async applyUpdate(
    @RequiredOrganizationId() organizationId: string,
    @Param('screenId', ParseObjectIdPipe) screenId: string,
  ): Promise<null> {
    await this.playerService.applyUpdateOnScreenDevice(
      organizationId,
      screenId,
    );
    return null;
  }

  /**
   * Queues a command for the native shell — the path that still works when the
   * player page is the broken part. Slower than the socket by design: it waits
   * for the shell's next poll.
   */
  @Post(':screenId/device/shell/:command')
  @RequireOrgRole()
  @UseGuards(PlayerMaintenanceGuard)
  @HttpCode(HttpStatus.OK)
  @ApiSuccessNullResponse()
  async queueShellCommand(
    @RequiredOrganizationId() organizationId: string,
    @Param('screenId', ParseObjectIdPipe) screenId: string,
    @Param('command') command: string,
  ): Promise<null> {
    if (!isShellCommand(command)) {
      throw BusinessException.badRequest(`Unknown shell command: ${command}`);
    }
    await this.playerService.queueShellCommand(
      organizationId,
      screenId,
      command,
    );
    return null;
  }

  /** Asks the shell to bring its event log along on its next check-in. */
  @Post(':screenId/device/shell-log')
  @RequireOrgRole()
  @UseGuards(PlayerMaintenanceGuard)
  @HttpCode(HttpStatus.OK)
  @ApiSuccessNullResponse()
  async requestShellLog(
    @RequiredOrganizationId() organizationId: string,
    @Param('screenId', ParseObjectIdPipe) screenId: string,
  ): Promise<null> {
    await this.playerService.requestShellLog(organizationId, screenId);
    return null;
  }

  @Post(':screenId/device/step')
  @RequireOrgRole()
  @HttpCode(HttpStatus.OK)
  @ApiSuccessNullResponse()
  async step(
    @RequiredOrganizationId() organizationId: string,
    @Param('screenId', ParseObjectIdPipe) screenId: string,
    @Body() dto: StepDeviceDto,
  ): Promise<null> {
    await this.playerService.stepScreenDevice(
      organizationId,
      screenId,
      dto.direction,
    );
    return null;
  }

  @Delete(':screenId/device')
  @RequireOrgRole()
  @HttpCode(HttpStatus.OK)
  @ApiSuccessNullResponse()
  async unpair(
    @RequiredOrganizationId() organizationId: string,
    @Param('screenId', ParseObjectIdPipe) screenId: string,
  ): Promise<null> {
    await this.playerService.unpairScreenDevice(organizationId, screenId);
    return null;
  }
}
