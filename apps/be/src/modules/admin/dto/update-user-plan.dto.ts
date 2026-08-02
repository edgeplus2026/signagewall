import { IsEnum, IsInt, Max, Min } from 'class-validator';

import { UserPlan } from '../../users/schemas/user.schema';

/**
 * The only way a plan ever changes — there is no payment integration, so a
 * super-admin sets this by hand once an invoice is settled.
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
