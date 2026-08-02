import type { Organization } from '@/features/organizations/types/organization.types'
import type { PlanTier } from '@/features/plans/types/plan.types'

export interface AdminUserListItem {
  id: string
  name: string
  email: string
  provider: string
  isActive: boolean
  isSuperAdmin: boolean
  organizationCount: number
  plan: PlanTier
  screenLimit: number
  /** `null` for enterprise accounts — they do not expire. */
  trialEndsAt: string | null
  createdAt: string
}

export interface PaginatedAdminUsers {
  items: AdminUserListItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AdminUserDetail {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  provider: string
  isActive: boolean
  isSuperAdmin: boolean
  hasPassword: boolean
  plan: PlanTier
  screenLimit: number
  /** Screens across every organization this user owns — what the limit caps. */
  screensUsed: number
  trialEndsAt: string | null
  createdAt: string
  updatedAt: string
  organizations: Organization[]
}
