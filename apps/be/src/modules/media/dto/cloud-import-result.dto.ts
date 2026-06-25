import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { MediaItemResponseDto } from '../mappers/media.mapper';

export type CloudImportItemStatus = 'imported' | 'failed';

export class CloudImportResultItemDto {
  @ApiProperty({ description: 'Provider-native id, echoed from the request.' })
  externalId!: string;

  @ApiProperty({ enum: ['imported', 'failed'] })
  status!: CloudImportItemStatus;

  @ApiPropertyOptional({ description: 'Created media id (when imported).' })
  mediaId?: string;

  @ApiPropertyOptional({
    description:
      'Stable failure code when status is "failed" (e.g. forbidden_host, ' +
      'download_failed, invalid_file_type, file_too_large, import_failed).',
  })
  error?: string;

  // Typed as Object in Swagger to match the existing media controller, where
  // MediaItemResponseDto is an interface rather than a class.
  @ApiPropertyOptional({ type: Object, description: 'Created media item.' })
  media?: MediaItemResponseDto;
}

export class CloudImportResponseDto {
  @ApiProperty({ type: [CloudImportResultItemDto] })
  results!: CloudImportResultItemDto[];

  @ApiProperty()
  importedCount!: number;

  @ApiProperty()
  failedCount!: number;
}
