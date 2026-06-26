import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, Matches } from 'class-validator';

export class SetDeviceDailyReloadDto {
  @ApiProperty({
    example: true,
    description: 'Whether the automatic daily reload is enabled.',
  })
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({
    example: '03:00',
    description: "Time of day (24h 'HH:mm') in the device's local timezone.",
  })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'time must be a 24-hour HH:mm value',
  })
  time!: string;
}
