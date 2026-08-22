import { useQuery } from '@tanstack/react-query'

import { downloadsApi } from '@/features/downloads/api/downloadsApi'

export const androidReleaseQueryKey = ['player', 'release', 'android'] as const

/**
 * The current player build. Not organization-scoped — the answer is the same for
 * everyone — and cached generously, because a release changes a few times a week
 * while this is rendered on every visit to the download page and on every unpaired
 * screen.
 */
export function useAndroidRelease() {
  return useQuery({
    queryKey: androidReleaseQueryKey,
    queryFn: downloadsApi.androidRelease,
    staleTime: 10 * 60 * 1000,
  })
}
