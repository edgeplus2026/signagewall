import { ApiProperty } from '@nestjs/swagger';

export class OrganizationResponseSchema {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ['admin', 'member'] })
  role: 'admin' | 'member';
}
