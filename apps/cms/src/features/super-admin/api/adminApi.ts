import type { AuthResponse } from '@/features/auth/types/auth.types'
import type {
  AdminUpgradeRequest,
  PaginatedAdminUpgradeRequests,
  UpdateUserPlanPayload,
} from '@/features/plans/types/plan.types'
import type {
  AdminUserDetail,
  AdminUserListItem,
  PaginatedAdminUsers,
} from '@/features/super-admin/types/admin.types'
import { api } from '@/lib/axios'

const ADMIN_BASE = '/admin'

export interface ListUpgradeRequestsParams {
  page?: number
  limit?: number
  status?: 'open' | 'resolved'
}

export type AdminUsersSortField = 'name' | 'createdAt' | 'isActive' | 'organizationCount'
export type AdminUsersSortOrder = 'asc' | 'desc'

export interface ListAdminUsersParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: AdminUsersSortField
  sortOrder?: AdminUsersSortOrder
}

export const adminApi = {
  listUsers: async (params: ListAdminUsersParams = {}): Promise<PaginatedAdminUsers> => {
    const { data } = await api.get<PaginatedAdminUsers>(`${ADMIN_BASE}/users`, {
      params,
    })
    return data
  },

  getUser: async (userId: string): Promise<AdminUserDetail> => {
    const { data } = await api.get<AdminUserDetail>(`${ADMIN_BASE}/users/${userId}`)
    return data
  },

  impersonate: async (userId: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>(`${ADMIN_BASE}/users/${userId}/impersonate`)
    return data
  },

  promoteSuperAdmin: async (userId: string): Promise<AdminUserListItem> => {
    const { data } = await api.post<AdminUserListItem>(
      `${ADMIN_BASE}/users/${userId}/promote-super-admin`,
    )
    return data
  },

  demoteSuperAdmin: async (userId: string): Promise<AdminUserListItem> => {
    const { data } = await api.post<AdminUserListItem>(
      `${ADMIN_BASE}/users/${userId}/demote-super-admin`,
    )
    return data
  },

  deleteUser: async (userId: string): Promise<void> => {
    await api.delete(`${ADMIN_BASE}/users/${userId}`)
  },

  /** The whole billing system: set the tier and the licence count by hand. */
  updateUserPlan: async (
    userId: string,
    payload: UpdateUserPlanPayload,
  ): Promise<AdminUserListItem> => {
    const { data } = await api.patch<AdminUserListItem>(
      `${ADMIN_BASE}/users/${userId}/plan`,
      payload,
    )
    return data
  },

  listUpgradeRequests: async (
    params: ListUpgradeRequestsParams = {},
  ): Promise<PaginatedAdminUpgradeRequests> => {
    const { data } = await api.get<PaginatedAdminUpgradeRequests>(
      `${ADMIN_BASE}/upgrade-requests`,
      { params },
    )
    return data
  },

  resolveUpgradeRequest: async (
    requestId: string,
  ): Promise<AdminUpgradeRequest> => {
    const { data } = await api.post<AdminUpgradeRequest>(
      `${ADMIN_BASE}/upgrade-requests/${requestId}/resolve`,
    )
    return data
  },
}
