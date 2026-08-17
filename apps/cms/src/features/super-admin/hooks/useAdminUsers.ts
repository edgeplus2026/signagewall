import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { UpdateUserPlanPayload } from '@/features/plans/types/plan.types'
import {
  adminApi,
  type AdminUsersSortField,
  type AdminUsersSortOrder,
  type ListAdminUsersParams,
} from '@/features/super-admin/api/adminApi'

const ADMIN_USERS_QUERY_KEY = ['admin', 'users'] as const
const UPGRADE_REQUESTS_QUERY_KEY = ['admin', 'upgrade-requests'] as const
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
    queryFn: () => {
      if (!userId) throw new Error('Missing user id')
      return adminApi.getUser(userId)
    },
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

export function useDeleteAdminUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => adminApi.deleteUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: UPGRADE_REQUESTS_QUERY_KEY })
    },
  })
}

export function useUpdateUserPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string
      payload: UpdateUserPlanPayload
    }) => adminApi.updateUserPlan(userId, payload),
    onSuccess: (_data, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId] })
      // Raising a plan resolves that user's open requests server-side.
      void queryClient.invalidateQueries({ queryKey: UPGRADE_REQUESTS_QUERY_KEY })
    },
  })
}

export function useUpgradeRequests(params: {
  page: number
  limit?: number
  status?: 'open' | 'resolved'
}) {
  const { page, limit = DEFAULT_PAGE_SIZE, status } = params

  return useQuery({
    queryKey: [...UPGRADE_REQUESTS_QUERY_KEY, page, limit, status],
    queryFn: () =>
      adminApi.listUpgradeRequests({ page, limit, ...(status ? { status } : {}) }),
    placeholderData: keepPreviousData,
  })
}

/** Drives the count badge on the Upgrade requests tab. */
export function useOpenUpgradeRequestCount() {
  return useQuery({
    queryKey: [...UPGRADE_REQUESTS_QUERY_KEY, 'open-count'],
    queryFn: async () => {
      const result = await adminApi.listUpgradeRequests({
        page: 1,
        limit: 1,
        status: 'open',
      })
      return result.total
    },
  })
}

export function useResolveUpgradeRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestId: string) => adminApi.resolveUpgradeRequest(requestId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: UPGRADE_REQUESTS_QUERY_KEY })
    },
  })
}

/**
 * Pushes a pending player update to every connected device. Nothing to
 * invalidate — the fleet answers by restarting into the new build, which no
 * query here describes.
 */
export function useApplyPlayerUpdate() {
  return useMutation({
    mutationFn: () => adminApi.applyPlayerUpdate(),
  })
}

export { DEFAULT_PAGE_SIZE }
