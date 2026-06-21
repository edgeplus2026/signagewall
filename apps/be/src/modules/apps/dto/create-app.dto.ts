import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { AppStatus } from '../schemas/app.schema';

/**
 * Creates a catalog entry for an app that exists in code. The technical
 * definition (runtimeKind/dataSource/configSchema/version) is taken from the
 * matching manifest by `slug`; this DTO carries only the presentation and
 * governance the super-admin controls.
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  iconUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  screenshots?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ enum: AppStatus })
  @IsOptional()
  @IsIn([AppStatus.DRAFT, AppStatus.PUBLISHED])
  status?: AppStatus;
}
