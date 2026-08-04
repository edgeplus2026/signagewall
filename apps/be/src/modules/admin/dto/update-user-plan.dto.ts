import { IsEnum, IsInt, Max, Min } from 'class-validator';

import { UserPlan } from '../../users/schemas/user.schema';

/**
 * Legacy/emergency entitlement override. Manual invoice payment is the normal
 * path for activating a paid plan.
 */
export class UpdateUserPlanDto {
  @IsEnum(UserPlan)
  plan: UserPlan;

  /** Licences sold. 0 is allowed: it freezes an account without deleting it. */
  @IsInt()
  @Min(0)
  @Max(10000)
  screenLimit: number;
}
