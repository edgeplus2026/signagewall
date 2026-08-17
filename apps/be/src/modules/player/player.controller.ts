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
import type { ShellStatusReport } from '@signagewall/player-contract';

import { Public } from '../../common/decorators/public.decorator';
import { ApiSuccessResponse } from '../../common/swagger';
import { BusinessException } from '../../common/exceptions/business.exception';
import { CurrentDevice } from './decorators/current-device.decorator';
import { PlayerTokenGuard } from './guards/player-token.guard';
import { PlayerService } from './player.service';
import type { DeviceDocument } from './schemas/device.schema';

/**
 * Player-facing REST. Authenticated by the opaque device token (not a CMS user
 * session), so routes are `@Public()` (to bypass the global JwtAuthGuard) and
 * guarded by {@link PlayerTokenGuard}.
 *
 * Everything the PAGE says travels over Socket.IO — content, presence, commands,
 * diagnostics. What is left here is deliberately narrow:
 *  - `shell/status`, the native shell's own line to the backend, which exists
 *    precisely for the case where the page is the thing that broke.
 *  - `content`, a read-only snapshot fetch: an escape hatch for inspecting what
 *    the backend thinks a screen should be showing.
 *
 * This is NOT a "fallback API", and the previous version of this note calling it
 * one is what invited a heartbeat endpoint that quietly erased device profiles
 * (see the note at the bottom of the class). A device that cannot hold a
 * WebSocket already falls back to long-polling inside Socket.IO; a device whose
 * page is dead reports through `shell/status`. Neither needs a second way to
 * write presence, and adding one makes the online flag mean less than it does now.
 */
@ApiTags('player')
@Public()
@Controller('player')
@UseGuards(PlayerTokenGuard)
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  /**
   * The native shell's own check-in, authenticated by the same device token the
   * page uses. Answers with whatever an operator queued for it.
   *
   * POST because it both reports and collects, and deliberately on the player
   * path rather than the CMS one: this is a device talking about itself, not an
   * operator acting on it.
   */
  @Post('shell/status')
  @HttpCode(HttpStatus.OK)
  @ApiSuccessResponse(Object)
  shellStatus(
    @CurrentDevice() device: DeviceDocument,
    @Body() body: ShellStatusReport,
  ) {
    return this.playerService.recordShellStatus(device.deviceId, body ?? {});
  }

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

  /*
   * There is deliberately NO `POST /player/heartbeat` here, and it is worth
   * saying why so nobody adds one back as an "offline fallback".
   *
   * It existed, nothing ever called it, and it was wrong in two ways. It sent
   * only the screen dimensions, and the presence write does `$set: { profile }`
   * — which REPLACES the subdocument rather than merging it, so one call
   * silently erased everything the dashboard knew about that screen: user agent,
   * player and shell versions, runtime, update status, diagnostics, Device Owner.
   * The screen kept playing; only the device tab went blank, which is the kind of
   * fault you look for in the player for an afternoon.
   *
   * And it set `online: true` outside the socket. `recordShellStatus` refuses to
   * do that on purpose — online in this product means "the player page is talking
   * to us", and a second path that says otherwise makes the whole presence signal
   * untrustworthy.
   *
   * The case it was meant to cover — a network that blocks WebSocket — is already
   * handled: the player's socket falls back to HTTP long-polling, and a device
   * whose PAGE is dead reports through the shell channel above.
   */
}
