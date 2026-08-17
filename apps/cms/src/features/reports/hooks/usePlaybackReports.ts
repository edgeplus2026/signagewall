import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { reportsApi } from '@/features/reports/api/reportsApi'
import type { ReportSchedule } from '@/features/reports/types/reports.types'

export interface ReportFocus {
  contentId?: string
}

/**
 * The coverage matrix for one day.
 *
 * Not polled. Yesterday's coverage does not change, and today's changes at the
 * pace screens report — every five minutes — so a live-updating matrix would
 * flicker without telling anyone anything they could act on faster.
 */
export function useCoverage(day: string, focus?: ReportFocus) {
  return useQuery({
    queryKey: ['playback', 'coverage', day, focus ?? null],
    queryFn: () => reportsApi.coverage(day, focus),
    staleTime: 60_000,
  })
}

export function useDayparting(from: string, to: string, focus?: ReportFocus) {
  return useQuery({
    queryKey: ['playback', 'dayparting', from, to, focus ?? null],
    queryFn: () => reportsApi.dayparting(from, to, focus),
    staleTime: 60_000,
  })
}

export function usePlan(day: string) {
  return useQuery({
    queryKey: ['playback', 'plan', day],
    queryFn: () => reportsApi.plan(day),
    staleTime: 60_000,
  })
}

export function useReportSchedule() {
  return useQuery({
    queryKey: ['playback', 'schedule'],
    queryFn: () => reportsApi.schedule(),
    staleTime: 300_000,
  })
}

export function useSaveReportSchedule() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (schedule: Omit<ReportSchedule, 'lastSentAt' | 'lastError'>) =>
      reportsApi.saveSchedule(schedule),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['playback', 'schedule'] })
    },
  })
}

export function usePlaybackItems(from: string, to: string, screenIds?: string[]) {
  return useQuery({
    queryKey: ['playback', 'items', from, to, screenIds ?? []],
    queryFn: () => reportsApi.items(from, to, screenIds),
    staleTime: 60_000,
  })
}
