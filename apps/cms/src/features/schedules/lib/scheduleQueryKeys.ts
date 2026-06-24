export const SCHEDULES_QUERY_ROOT = 'schedules' as const

export function schedulesQueryKey(organizationId: string | null | undefined) {
  return [SCHEDULES_QUERY_ROOT, organizationId ?? 'none'] as const
}

export function scheduleDetailQueryKey(
  organizationId: string | null | undefined,
  id: string,
) {
  return [...schedulesQueryKey(organizationId), 'detail', id] as const
}

export function scheduleScreensQueryKey(
  organizationId: string | null | undefined,
  id: string,
) {
  return [...scheduleDetailQueryKey(organizationId, id), 'screens'] as const
}
