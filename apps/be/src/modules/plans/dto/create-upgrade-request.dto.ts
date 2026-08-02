import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
} from 'class-validator';

/** Mirrors the "Get in touch" form on the marketing site, minus the identity
 * fields — the caller is authenticated, so name and email come from the token. */
export class CreateUpgradeRequestDto {
  /** Total screens wanted, not the delta. Capped to keep typos out of the queue. */
  @IsInt()
  @Min(1)
  @Max(10000)
  requestedScreens: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;
}
