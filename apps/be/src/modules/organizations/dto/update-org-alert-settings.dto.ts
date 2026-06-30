import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

import type { AlertRecipientRole } from '../schemas/organization.schema';

export class UpdateOrgAlertSettingsDto {
  @ApiPropertyOptional({ description: 'Master switch for offline alerting.' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 1440,
    description: 'Minutes offline before an alert fires.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  offlineThresholdMin?: number;

  @ApiPropertyOptional({
    isArray: true,
    enum: ['admin', 'member'],
    description: 'Member roles that receive the alert.',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(['admin', 'member'], { each: true })
  recipientRoles?: AlertRecipientRole[];

  @ApiPropertyOptional({
    description: 'Suppress alerts during scheduled availability-off windows.',
  })
  @IsOptional()
  @IsBoolean()
  respectAvailability?: boolean;
}
