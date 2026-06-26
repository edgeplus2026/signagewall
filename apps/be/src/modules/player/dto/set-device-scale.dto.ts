import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { DeviceScale } from '../schemas/device.schema';

export class SetDeviceScaleDto {
  @ApiProperty({
    enum: DeviceScale,
    example: DeviceScale.FIT,
    description: 'How content is fitted to the screen.',
  })
  @IsEnum(DeviceScale)
  scale!: DeviceScale;
}
