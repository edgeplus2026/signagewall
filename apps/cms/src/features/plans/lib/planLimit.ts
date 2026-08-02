import type { PlanLimitDetails } from '@/features/plans/types/plan.types'
import { ApiError } from '@/lib/api-error'

const isPlanLimitDetails = (value: unknown): value is PlanLimitDetails =>
  typeof value === 'object' &&
  value !== null &&
  (value as { reason?: unknown }).reason === 'PLAN_LIMIT_REACHED'

/**
 * The plan-limit payload behind a rejected create, or `null` for every other
 * failure. Callers use it to open the upgrade modal instead of toasting: hitting
 * the licence cap is a sales moment, not an error the user can fix.
 */
export function getPlanLimitDetails(error: unknown): PlanLimitDetails | null {
  if (!(error instanceof ApiError)) {
    return null
  }

  return isPlanLimitDetails(error.details) ? error.details : null
}
