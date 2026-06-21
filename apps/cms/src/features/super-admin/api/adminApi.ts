import type { AuthResponse } from '@/features/auth/types/auth.types'
import type {
  AdminUserDetail,
  AdminUserListItem,
  PaginatedAdminUsers,
} from '@/features/super-admin/types/admin.types'
import { api } from '@/lib/axios'

const ADMIN_BASE = '/admin'

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
}
