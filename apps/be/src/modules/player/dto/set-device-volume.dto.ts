import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class SetDeviceVolumeDto {
  @ApiProperty({
    example: 80,
    minimum: 0,
    maximum: 100,
    description: 'Playback volume (0–100)',
  })
  @IsInt()
  @Min(0)
  @Max(100)
  volume!: number;
}
