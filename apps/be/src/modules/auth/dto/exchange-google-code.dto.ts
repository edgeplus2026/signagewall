import { IsString, Length } from 'class-validator';

export class ExchangeGoogleCodeDto {
  /** 32 random bytes, hex-encoded by the Google callback redirect. */
  @IsString()
  @Length(64, 64)
  code: string;
}
