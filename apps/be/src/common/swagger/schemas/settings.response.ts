import { ApiProperty } from '@nestjs/swagger';

export class AccountSettingsSchema {
  @ApiProperty({ enum: ['en', 'sr'] })
  language: 'en' | 'sr';

  @ApiProperty({ enum: ['light', 'dark', 'system'] })
  theme: 'light' | 'dark' | 'system';
}
