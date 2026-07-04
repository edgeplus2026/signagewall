import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import {
  GOALS,
  INDUSTRIES,
  LANGUAGES,
  TONES,
  type ContentGoal,
  type ContentLanguage,
  type ContentTone,
  type Industry,
} from '@edge/apps-contract';

/**
 * The business context collected by the multi-step wizard. Allowed values for
 * the select fields come from the shared `@edge/apps-contract` const arrays, so
 * the frontend options and this allow-list can never drift apart. Deliberately
 * no playlist-duration or slide-count fields — those are defaulted server-side.
 */
export class CreateAiGenerationDto {
  @ApiProperty({ enum: [...INDUSTRIES] })
  @IsIn([...INDUSTRIES])
  industry!: Industry;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  businessName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  targetAudience?: string;

  @ApiProperty({ enum: [...GOALS] })
  @IsIn([...GOALS])
  primaryGoal!: ContentGoal;

  @ApiProperty({ enum: [...TONES] })
  @IsIn([...TONES])
  tone!: ContentTone;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  keyPoints?: string[];

  @ApiProperty({ enum: [...LANGUAGES] })
  @IsIn([...LANGUAGES])
  language!: ContentLanguage;
}
