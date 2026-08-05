import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsObject, IsOptional } from 'class-validator';

/** Draft instance config to resolve live-preview connector data for. */
export class PreviewAppDataDto {
  @ApiPropertyOptional({
    description:
      'Owned app instance whose connection/private assets may be previewed.',
  })
  @IsOptional()
  @IsMongoId()
  appInstanceId?: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Draft app config to fetch preview data for.',
  })
  @IsObject()
  config!: Record<string, unknown>;
}
