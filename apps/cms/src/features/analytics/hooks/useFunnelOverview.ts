import { useQuery } from '@tanstack/react-query'

import { analyticsApi } from '@/features/analytics/api/analyticsApi'

export function useFunnelOverview(days: number) {
  const to = new Date()
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)

  return useQuery({
    queryKey: ['admin', 'analytics', 'funnel', days],
    queryFn: () => analyticsApi.overview(from.toISOString(), to.toISOString()),
    refetchInterval: 60_000,
  })
}
