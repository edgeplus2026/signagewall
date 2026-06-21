import { IsIn, IsOptional } from 'class-validator';

export class UpdateAccountSettingsDto {
  @IsOptional()
  @IsIn(['en', 'sr'])
  language?: 'en' | 'sr';

  @IsOptional()
  @IsIn(['light', 'dark', 'system'])
  theme?: 'light' | 'dark' | 'system';
}
