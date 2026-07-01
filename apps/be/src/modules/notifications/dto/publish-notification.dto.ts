import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class PublishNotificationDto {
  /** Optional auto-hide timestamp. Omit for a notification that never expires. */
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
