import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class UpdateAppInstanceConfigDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Instance config; validated against the app config schema.',
  })
  @IsObject()
  config!: Record<string, unknown>;
}
