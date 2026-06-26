import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { DeviceOrientation } from '../schemas/device.schema';

export class SetDeviceOrientationDto {
  @ApiProperty({
    enum: DeviceOrientation,
    example: DeviceOrientation.LANDSCAPE,
    description: 'Screen orientation applied by the player.',
  })
  @IsEnum(DeviceOrientation)
  orientation!: DeviceOrientation;
}
