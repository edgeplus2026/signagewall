import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  adminApi,
  type AdminUsersSortField,
  type AdminUsersSortOrder,
  type ListAdminUsersParams,
} from '@/features/super-admin/api/adminApi'

const ADMIN_USERS_QUERY_KEY = ['admin', 'users'] as const
const DEFAULT_PAGE_SIZE = 20

export interface AdminUsersQueryParams {
  page: number
  limit?: number
  search?: string
  sortBy?: AdminUsersSortField
  sortOrder?: AdminUsersSortOrder
}

export function useAdminUsers(params: AdminUsersQueryParams) {
  const { page, limit = DEFAULT_PAGE_SIZE, search, sortBy, sortOrder } = params

  return useQuery({
    queryKey: [...ADMIN_USERS_QUERY_KEY, page, limit, search, sortBy, sortOrder],
    queryFn: () => {
      const params: ListAdminUsersParams = { page, limit }

      if (search) {
        params.search = search
      }

      if (sortBy) {
        params.sortBy = sortBy
      }

      if (sortOrder) {
        params.sortOrder = sortOrder
      }

      return adminApi.listUsers(params)
    },
    placeholderData: keepPreviousData,
  })
}

export function useAdminUser(userId: string | null) {
  return useQuery({
    queryKey: ['admin', 'users', userId],
    queryFn: () => adminApi.getUser(userId!),
    enabled: !!userId,
  })
}

export function usePromoteSuperAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => adminApi.promoteSuperAdmin(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY })
    },
  })
}

export function useDemoteSuperAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => adminApi.demoteSuperAdmin(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY })
    },
  })
}

export { DEFAULT_PAGE_SIZE }
