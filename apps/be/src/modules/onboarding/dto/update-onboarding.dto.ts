import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateOnboardingDto {
  /** `true` closes the checklist for good; `false` brings it back. */
  @IsOptional()
  @IsBoolean()
  dismissed?: boolean;

  /** The user has seen the completion state — stop showing the checklist. */
  @IsOptional()
  @IsBoolean()
  completionAcknowledged?: boolean;
}
