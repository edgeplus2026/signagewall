import { IsString, MinLength } from 'class-validator';

import { Match } from '../../../common/decorators/match.decorator';

export class SetPasswordDto {
  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(6)
  @Match('password', { message: 'Passwords do not match' })
  confirmPassword: string;
}
