import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { ALLOWED_MEDIA_MIME_TYPES } from '../media.constants';

/** Cloud source a picked item came from — drives the persisted media source
 * and which host allowlist applies during download. */
export enum CloudImportProvider {
  GOOGLE_DRIVE = 'google_drive',
  GOOGLE_PHOTOS = 'google_photos',
  ONEDRIVE = 'onedrive',
  DROPBOX = 'dropbox',
}

/** How the backend obtains the bytes for one picked item. */
export enum CloudImportStrategy {
  /** HTTP GET a direct/temporary URL (Dropbox link, Google Photos baseUrl). */
  URL = 'url',
  /** Google Drive: GET files/{fileId}?alt=media with a Bearer access token. */
  GOOGLE_DRIVE = 'google-drive',
  /** OneDrive/SharePoint: resolve @microsoft.graph.downloadUrl, then GET it. */
  MSGRAPH = 'msgraph',
}

/** Upper bound on items per import batch — caps outbound fan-out and memory. */
export const CLOUD_IMPORT_MAX_ITEMS = 50;

export class CloudImportItemDto {
  @ApiProperty({ enum: CloudImportProvider })
  @IsEnum(CloudImportProvider)
  provider!: CloudImportProvider;

  @ApiProperty({ enum: CloudImportStrategy })
  @IsEnum(CloudImportStrategy)
  strategy!: CloudImportStrategy;

  @ApiProperty({
    description: 'Provider-native id; echoed back in the result.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  externalId!: string;

  @ApiProperty({ description: 'Display/file name.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description:
      'Client-declared MIME type. Validated per-item server-side against the ' +
      `allowed types (${ALLOWED_MEDIA_MIME_TYPES.join(', ')}) and re-verified ` +
      'against the downloaded bytes.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  mimeType!: string;

  @ApiPropertyOptional({ description: 'Client-declared size in bytes (hint).' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  width?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  height?: number;

  // --- strategy === 'url' --------------------------------------------------
  @ApiPropertyOptional({
    description: 'Direct/temporary download URL (URL strategy only).',
  })
  @ValidateIf((o: CloudImportItemDto) => o.strategy === CloudImportStrategy.URL)
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(8192)
  downloadUrl?: string;

  @ApiPropertyOptional({
    description:
      'Bearer token sent as Authorization on the URL GET (e.g. Google ' +
      'Photos). Used immediately server-side; never persisted.',
  })
  @ValidateIf((o: CloudImportItemDto) => o.strategy === CloudImportStrategy.URL)
  @IsOptional()
  @IsString()
  @MaxLength(8192)
  authToken?: string;

  // --- strategy === 'google-drive' -----------------------------------------
  @ApiPropertyOptional({
    description: 'Google Drive file id (Drive strategy).',
  })
  @ValidateIf(
    (o: CloudImportItemDto) => o.strategy === CloudImportStrategy.GOOGLE_DRIVE,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  fileId?: string;

  // --- strategy === 'msgraph' ----------------------------------------------
  @ApiPropertyOptional({
    description:
      'Microsoft Graph endpoint base for the item (msgraph strategy).',
  })
  @ValidateIf(
    (o: CloudImportItemDto) => o.strategy === CloudImportStrategy.MSGRAPH,
  )
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(8192)
  endpoint?: string;

  @ApiPropertyOptional({ description: 'Graph driveId (msgraph strategy).' })
  @ValidateIf(
    (o: CloudImportItemDto) => o.strategy === CloudImportStrategy.MSGRAPH,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  driveId?: string;

  @ApiPropertyOptional({ description: 'Graph itemId (msgraph strategy).' })
  @ValidateIf(
    (o: CloudImportItemDto) => o.strategy === CloudImportStrategy.MSGRAPH,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  itemId?: string;

  // --- shared by 'google-drive' + 'msgraph' --------------------------------
  @ApiPropertyOptional({
    description:
      'Short-lived OAuth access token (Drive/Graph strategies). Used ' +
      'immediately server-side; never persisted.',
  })
  @ValidateIf(
    (o: CloudImportItemDto) =>
      o.strategy === CloudImportStrategy.GOOGLE_DRIVE ||
      o.strategy === CloudImportStrategy.MSGRAPH,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(8192)
  accessToken?: string;
}

export class ImportCloudMediaDto {
  @ApiPropertyOptional({
    nullable: true,
    description: 'Destination folder; root when omitted.',
  })
  @IsOptional()
  @IsMongoId()
  parentId?: string | null;

  @ApiProperty({ type: [CloudImportItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(CLOUD_IMPORT_MAX_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => CloudImportItemDto)
  items!: CloudImportItemDto[];
}
