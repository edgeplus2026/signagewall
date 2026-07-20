import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Creates a catalog entry for an app that exists in code. The technical
 * definition (runtimeKind/dataSource/configSchema/version) and icon/colour come
 * from the matching manifest by `slug`; copy (tagline/description/about) and
 * categories are code + i18n, not stored. This DTO carries only the display name
 * and the public toggle the super-admin controls.
 */
export class CreateAppDto {
  @ApiProperty({ description: 'Slug of an available code manifest.' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  slug!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
