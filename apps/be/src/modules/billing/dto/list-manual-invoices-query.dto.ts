import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { ManualInvoiceStatus } from '../schemas/manual-invoice.schema';

export class ListManualInvoicesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ManualInvoiceStatus })
  @IsOptional()
  @IsEnum(ManualInvoiceStatus)
  status?: ManualInvoiceStatus;
}
