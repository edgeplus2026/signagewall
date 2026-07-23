import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { KioskMode } from '../schemas/device.schema';

export class SetDeviceKioskModeDto {
  @ApiProperty({
    enum: KioskMode,
    example: KioskMode.OFF,
    description: 'Kiosk lockdown level enforced by the native shell.',
  })
  @IsEnum(KioskMode)
  kioskMode!: KioskMode;
}
