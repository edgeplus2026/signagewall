import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class MarkManualInvoicePaidDto {
  @ApiProperty({
    description: 'Bank transfer or other reconciliation reference.',
  })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  paymentReference: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
