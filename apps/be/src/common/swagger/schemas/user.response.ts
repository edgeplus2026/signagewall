import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseSchema {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  company?: string;

  @ApiProperty({ enum: ['local', 'google'] })
  provider: 'local' | 'google';

  @ApiProperty()
  hasPassword: boolean;

  @ApiProperty()
  isSuperAdmin: boolean;
}
