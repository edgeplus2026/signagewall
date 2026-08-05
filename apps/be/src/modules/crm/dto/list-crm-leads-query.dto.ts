import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { CrmLeadStatus, CrmLeadType } from '../schemas/crm-lead.schema';

export class ListCrmLeadsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(CrmLeadStatus)
  status?: CrmLeadStatus;

  @IsOptional()
  @IsEnum(CrmLeadType)
  type?: CrmLeadType;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;
}
