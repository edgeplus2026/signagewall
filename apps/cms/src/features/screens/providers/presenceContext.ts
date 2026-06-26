import { createContext, useContext, useMemo } from 'react'

import type { ScreenDevice } from '@/features/screens/types/screen.types'

export type PresenceMap = Record<string, ScreenDevice>

export const PresenceContext = createContext<PresenceMap>({})

/** Live presence for a single screen, or `undefined` if none is known yet. */
export function useScreenPresence(
  screenId: string | undefined,
): ScreenDevice | undefined {
  const map = useContext(PresenceContext)
  return useMemo(() => (screenId ? map[screenId] : undefined), [map, screenId])
}
