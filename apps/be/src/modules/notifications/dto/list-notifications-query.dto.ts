import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import type { NotificationStatus } from '../schemas/notification.schema';

export class ListNotificationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['draft', 'published'] })
  @IsOptional()
  @IsIn(['draft', 'published'])
  status?: NotificationStatus;
}
