import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetAppVisibilityDto {
  @ApiProperty({ description: 'Whether the app is offered to organizations.' })
  @IsBoolean()
  isPublic!: boolean;
}
