import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { NormalizeEmail } from '../../../common/decorators/normalize-email.decorator';
import { CrmLeadType } from '../schemas/crm-lead.schema';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

const uppercase = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CreateCrmLeadDto {
  @IsUUID()
  submissionId: string;

  @IsEnum(CrmLeadType)
  type: CrmLeadType;

  @IsString()
  @Transform(trim)
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(160)
  company?: string;

  @IsString()
  @Transform(trim)
  @MinLength(1)
  @MaxLength(5000)
  message: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  screenQuantity?: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @Transform(uppercase)
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  country?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(20)
  locale?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  anonymousId?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(4096)
  acquisitionToken?: string;

  /** Honeypot. A populated value is acknowledged but never persisted. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
