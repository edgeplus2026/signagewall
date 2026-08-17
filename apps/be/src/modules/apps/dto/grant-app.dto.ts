import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class GrantAppDto {
  @ApiProperty({ description: 'Organization to entitle to this app.' })
  @IsMongoId()
  organizationId!: string;
}
