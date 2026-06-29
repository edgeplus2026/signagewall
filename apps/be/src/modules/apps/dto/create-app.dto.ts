import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Creates a catalog entry for an app that exists in code. The technical
 * definition (runtimeKind/dataSource/configSchema/version) is taken from the
 * matching manifest by `slug`; this DTO carries only the presentation and the
 * public toggle the super-admin controls.
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

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(280)
  tagline!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  about?: string;

  @ApiPropertyOptional({ description: 'Inline SVG markup for the app icon.' })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  iconSvg?: string;

  @ApiPropertyOptional({ description: 'Brand colour (hex).' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Ids of the catalog categories this app belongs to.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];
}
