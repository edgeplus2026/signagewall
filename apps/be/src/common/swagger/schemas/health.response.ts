import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseSchema {
  @ApiProperty({ example: 'ok' })
  status: string;

  @ApiProperty({ format: 'date-time' })
  timestamp: string;
}
