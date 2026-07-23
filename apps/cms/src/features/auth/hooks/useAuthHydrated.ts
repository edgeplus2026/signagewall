import { useSyncExternalStore } from 'react'

import { useAuthStore } from '@/features/auth/store/authStore'

/**
 * Whether the persisted auth store has finished rehydrating from storage.
 *
 * Reading it through `useSyncExternalStore` rather than effect + `useState` is
 * the point: hydration IS external state. Subscribing to it directly removes
 * the extra render the effect version cost and closes the window where
 * hydration finished between render and effect.
 */
export function useAuthHydrated() {
  return useSyncExternalStore(
    (onStoreChange) => useAuthStore.persist.onFinishHydration(onStoreChange),
    () => useAuthStore.persist.hasHydrated(),
    () => useAuthStore.persist.hasHydrated(),
  )
}
