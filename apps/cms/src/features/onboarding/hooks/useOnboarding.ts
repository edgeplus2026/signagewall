import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useAuthStore } from '@/features/auth/store/authStore'
import { onboardingApi } from '@/features/onboarding/api/onboardingApi'
import { onboardingQueryKey } from '@/features/onboarding/lib/onboardingQueryKeys'
import type {
  OnboardingState,
  UpdateOnboardingRequest,
} from '@/features/onboarding/types/onboarding.types'
import { useOrganizationStore } from '@/features/organizations/store/organizationStore'
import { PLAYLISTS_QUERY_ROOT } from '@/features/playlists/lib/playlistQueryKeys'
import { SCREENS_QUERY_ROOT } from '@/features/screens/lib/screenQueryKeys'

/** Query roots whose invalidation can flip a checklist step. */
const CONTENT_QUERY_ROOTS = new Set<string>([
  'media',
  PLAYLISTS_QUERY_ROOT,
  SCREENS_QUERY_ROOT,
])

/** Coalesces the burst of invalidations a single mutation usually fires. */
const REFRESH_DEBOUNCE_MS = 400

export function useOnboarding() {
  const token = useAuthStore((state) => state.token)
  const organizationId = useOrganizationStore((state) => state.activeOrganizationId)

  return useQuery({
    queryKey: onboardingQueryKey(organizationId),
    queryFn: onboardingApi.get,
    enabled: Boolean(token && organizationId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
}

export function useUpdateOnboarding() {
  const queryClient = useQueryClient()
  const organizationId = useOrganizationStore((state) => state.activeOrganizationId)

  return useMutation({
    mutationFn: (payload: UpdateOnboardingRequest) => onboardingApi.update(payload),
    // The response is the new state — write it straight in so dismissing the
    // checklist removes it immediately instead of after a round trip.
    onSuccess: (state: OnboardingState) => {
      queryClient.setQueryData(onboardingQueryKey(organizationId), state)
    },
  })
}

/**
 * Keeps the checklist honest while it is on screen.
 *
 * Steps are derived from content the user creates all over the app, so rather
 * than teaching every create/upload/pair mutation about onboarding, this
 * listens for the cache invalidations those mutations already fire and refetches
 * once the dust settles. It runs only while the checklist is actually visible,
 * so an established account never pays for it.
 */
export function useOnboardingAutoRefresh(enabled: boolean) {
  const queryClient = useQueryClient()
  const organizationId = useOrganizationStore((state) => state.activeOrganizationId)

  useEffect(() => {
    if (!enabled) {
      return
    }

    let timer: ReturnType<typeof setTimeout> | undefined

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'invalidate') {
        return
      }

      const [root] = event.query.queryKey as readonly unknown[]
      if (typeof root !== 'string' || !CONTENT_QUERY_ROOTS.has(root)) {
        return
      }

      clearTimeout(timer)
      timer = setTimeout(() => {
        void queryClient.invalidateQueries({
          queryKey: onboardingQueryKey(organizationId),
        })
      }, REFRESH_DEBOUNCE_MS)
    })

    return () => {
      clearTimeout(timer)
      unsubscribe()
    }
  }, [enabled, organizationId, queryClient])
}
