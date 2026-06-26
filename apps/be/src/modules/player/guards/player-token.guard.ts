import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

import { BusinessException } from '../../../common/exceptions/business.exception';
import { PlayerService } from '../player.service';
import { DeviceDocument } from '../schemas/device.schema';

/** Request key under which the authenticated device is attached. */
export const CURRENT_DEVICE_KEY = 'playerDevice';

interface PlayerRequest {
  headers: Record<string, string | string[] | undefined>;
  [CURRENT_DEVICE_KEY]?: DeviceDocument;
}

/**
 * Authenticates `/player/*` REST routes via the opaque device token in the
 * `Authorization: Bearer <token>` header. Pair with `@Public()` so the route
 * opts out of the global `JwtAuthGuard` (which is for CMS user sessions).
 */
@Injectable()
export class PlayerTokenGuard implements CanActivate {
  constructor(
    private readonly playerService: PlayerService,
    private readonly i18n: I18nService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PlayerRequest>();
    const token = this.extractToken(request.headers.authorization);

    if (!token) {
      throw BusinessException.unauthorized(this.i18n.t('player.tokenRequired'));
    }

    const device = await this.playerService.authenticateToken(token);

    if (!device) {
      throw BusinessException.unauthorized(this.i18n.t('player.invalidToken'));
    }

    request[CURRENT_DEVICE_KEY] = device;
    return true;
  }

  private extractToken(
    header: string | string[] | undefined,
  ): string | undefined {
    const value = Array.isArray(header) ? header[0] : header;

    if (!value?.startsWith('Bearer ')) {
      return undefined;
    }

    return value.slice('Bearer '.length).trim() || undefined;
  }
}
