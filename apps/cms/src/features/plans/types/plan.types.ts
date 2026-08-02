import type { ApiSchema } from '@/lib/api'

export type PlanTier = 'free' | 'enterprise'

export type PlanEntitlement = Omit<ApiSchema['PlanEntitlementSchema'], 'plan'> & {
  plan: PlanTier
}

export type UpgradeRequestStatus = 'open' | 'resolved'

export type AdminUpgradeRequest = Omit<
  ApiSchema['AdminUpgradeRequestSchema'],
  'planAtRequest' | 'status'
> & {
  planAtRequest: PlanTier
  status: UpgradeRequestStatus
}

export type PaginatedAdminUpgradeRequests = Omit<
  ApiSchema['PaginatedAdminUpgradeRequestsSchema'],
  'items'
> & {
  items: AdminUpgradeRequest[]
}

export interface CreateUpgradeRequestPayload {
  requestedScreens: number
  message?: string
  phone?: string
  company?: string
}

export interface UpdateUserPlanPayload {
  plan: PlanTier
  screenLimit: number
}

/**
 * `error.details` on the 403 the API returns when a plan limit blocks an action.
 * The CMS turns this into the upgrade modal rather than a bare toast.
 */
export interface PlanLimitDetails {
  reason: 'PLAN_LIMIT_REACHED'
  limitOf: 'screens' | 'organizations'
  plan: PlanTier
  limit: number
  used: number
}
