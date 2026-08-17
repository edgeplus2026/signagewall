import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export class CreateCampaignDto {
  @ApiProperty({ example: 'Letnja akcija 2026' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @Matches(DAY, { message: 'startDate must be YYYY-MM-DD' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-08-31' })
  @IsOptional()
  @Matches(DAY, { message: 'endDate must be YYYY-MM-DD' })
  endDate?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contentIds?: string[];
}

export class UpdateCampaignDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(DAY, { message: 'startDate must be YYYY-MM-DD' })
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(DAY, { message: 'endDate must be YYYY-MM-DD' })
  endDate?: string;
}

/** Puts one content item in or out of a campaign, from the report table. */
export class CampaignMembershipDto {
  @ApiProperty()
  @IsString()
  @MaxLength(64)
  contentId!: string;

  @ApiProperty()
  @IsBoolean()
  member!: boolean;
}
