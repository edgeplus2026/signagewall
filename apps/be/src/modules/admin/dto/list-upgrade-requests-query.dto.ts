import { IsIn, IsOptional } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class ListUpgradeRequestsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['open', 'resolved'])
  status?: 'open' | 'resolved';
}
