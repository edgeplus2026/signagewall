import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@/features/auth/store/authStore'
import { plansApi } from '@/features/plans/api/plansApi'
import type { CreateUpgradeRequestPayload } from '@/features/plans/types/plan.types'

export const PLAN_QUERY_KEY = ['plans', 'me'] as const

/**
 * The signed-in account's plan and usage.
 *
 * Refetched on window focus so the header stops nagging shortly after a
 * super-admin raises the plan — there is no webhook to push that change, and a
 * customer who just paid should not have to reload to see it.
 */
export function usePlan() {
  const token = useAuthStore((state) => state.token)

  return useQuery({
    queryKey: PLAN_QUERY_KEY,
    queryFn: () => plansApi.getMyPlan(),
    enabled: !!token,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })
}

export function useRequestUpgrade() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateUpgradeRequestPayload) =>
      plansApi.requestUpgrade(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEY })
    },
  })
}
