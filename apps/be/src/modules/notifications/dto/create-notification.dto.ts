import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class NotificationTranslationDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  content: Record<string, unknown>;
}

export class NotificationTranslationOptionalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;
}

export class NotificationTranslationsDto {
  @ApiProperty({ type: NotificationTranslationDto })
  @ValidateNested()
  @Type(() => NotificationTranslationDto)
  en: NotificationTranslationDto;

  @ApiPropertyOptional({ type: NotificationTranslationOptionalDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationTranslationOptionalDto)
  sr?: NotificationTranslationOptionalDto;
}

export class CreateNotificationDto {
  @ApiProperty({ type: NotificationTranslationsDto })
  @ValidateNested()
  @Type(() => NotificationTranslationsDto)
  translations: NotificationTranslationsDto;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
