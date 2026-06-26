import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { ApiSuccessResponse } from '../../common/swagger';
import { BusinessException } from '../../common/exceptions/business.exception';
import { CurrentDevice } from './decorators/current-device.decorator';
import { PlayerHeartbeatDto } from './dto/player-heartbeat.dto';
import { PlayerTokenGuard } from './guards/player-token.guard';
import { PlayerService } from './player.service';
import type { DeviceDocument } from './schemas/device.schema';

/**
 * Player-facing REST. Authenticated by the opaque device token (not a CMS user
 * session), so routes are `@Public()` (to bypass the global JwtAuthGuard) and
 * guarded by {@link PlayerTokenGuard}. The realtime path is Socket.IO; these
 * endpoints are the cold-boot fetch and the offline-reconnect fallback.
 */
@ApiTags('player')
@Public()
@Controller('player')
@UseGuards(PlayerTokenGuard)
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Get('content')
  @ApiSuccessResponse(Object)
  async getContent(
    @CurrentDevice() device: DeviceDocument,
    @Query('since') since?: string,
  ) {
    const organizationId = device.organizationId?.toString();
    const screenId = device.screenId?.toString();

    if (!organizationId || !screenId) {
      throw BusinessException.notFound('Device is not bound to a screen');
    }

    const snapshot = await this.playerService.resolveSnapshot(
      organizationId,
      screenId,
    );

    if (!snapshot) {
      throw BusinessException.notFound('Screen no longer exists');
    }

    if (since && since === snapshot.revision) {
      return { changed: false, revision: snapshot.revision };
    }

    return { changed: true, snapshot };
  }

  @Post('heartbeat')
  @HttpCode(HttpStatus.NO_CONTENT)
  async heartbeat(
    @CurrentDevice() device: DeviceDocument,
    @Body() dto: PlayerHeartbeatDto,
  ): Promise<void> {
    await this.playerService.recordHeartbeat(device.deviceId, {
      ...(dto.screenWidth !== undefined
        ? { screenWidth: dto.screenWidth }
        : {}),
      ...(dto.screenHeight !== undefined
        ? { screenHeight: dto.screenHeight }
        : {}),
    });
  }
}
