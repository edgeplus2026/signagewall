import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { CURRENT_DEVICE_KEY } from '../guards/player-token.guard';
import { DeviceDocument } from '../schemas/device.schema';

/** Exposes the device authenticated by {@link PlayerTokenGuard}. */
export const CurrentDevice = createParamDecorator(
  (_data: unknown, context: ExecutionContext): DeviceDocument => {
    const request = context.switchToHttp().getRequest<{
      [CURRENT_DEVICE_KEY]?: DeviceDocument;
    }>();

    const device = request[CURRENT_DEVICE_KEY];

    if (!device) {
      throw new Error('CurrentDevice used without PlayerTokenGuard');
    }

    return device;
  },
);
