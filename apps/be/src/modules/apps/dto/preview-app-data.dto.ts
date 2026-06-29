import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

/** Draft instance config to resolve live-preview connector data for. */
export class PreviewAppDataDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Draft app config to fetch preview data for.',
  })
  @IsObject()
  config!: Record<string, unknown>;
}
