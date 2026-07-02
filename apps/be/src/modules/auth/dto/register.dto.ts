import {
  Equals,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import { NormalizeEmail } from '../../../common/decorators/normalize-email.decorator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  name: string;

  @NormalizeEmail()
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  phone: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  inviteToken?: string;

  /** Must be true — the user accepts the current Terms of Service + Privacy Policy. */
  @IsBoolean()
  @Equals(true)
  acceptedLegal: boolean;
}
