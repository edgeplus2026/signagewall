import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ApiSuccessResponse } from '../../common/swagger';
import { PlayerReleaseService } from './player-release.service';

/**
 * Where the CMS gets the player build to hand a customer.
 *
 * Its own controller, and deliberately not organization-scoped: which APK is
 * current is the same answer for everyone, it belongs to no tenant, and the file
 * it points at is already served publicly to every device in the fleet. Behind the
 * membership guard the download page would have to pick an organization to ask on
 * behalf of, which is a question the page does not have and does not need.
 *
 * Authenticated all the same — the global JWT guard still applies — because there
 * is no reason to publish the fleet's current version to the open internet, and the
 * only people who need it are already signed in.
 */
@ApiTags('player')
@Controller('player')
export class PlayerReleaseController {
  constructor(private readonly releases: PlayerReleaseService) {}

  @Get('release/android')
  @ApiSuccessResponse(Object)
  async androidRelease() {
    return this.releases.androidRelease();
  }
}
