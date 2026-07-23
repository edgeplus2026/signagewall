import { useSyncExternalStore } from 'react'

import { useOrganizationStore } from '@/features/organizations/store/organizationStore'

/**
 * Whether the persisted organization store has finished rehydrating. Same
 * reasoning as `useAuthHydrated`: hydration is external state, so it is read
 * with `useSyncExternalStore` instead of mirrored into React state by an effect.
 */
export function useOrganizationHydrated() {
  return useSyncExternalStore(
    (onStoreChange) =>
      useOrganizationStore.persist.onFinishHydration(onStoreChange),
    () => useOrganizationStore.persist.hasHydrated(),
    () => useOrganizationStore.persist.hasHydrated(),
  )
}
