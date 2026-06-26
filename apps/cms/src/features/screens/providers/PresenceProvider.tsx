import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { useOrganizationStore } from '@/features/organizations/store/organizationStore'
import { screensApi } from '@/features/screens/api/screensApi'
import {
  PresenceContext,
  type PresenceMap,
} from '@/features/screens/providers/presenceContext'
import {
  getRealtimeSocket,
  onDevicePresence,
  watchOrganization,
  type DevicePresenceEvent,
} from '@/lib/realtime'

/**
 * Holds live device presence for the active organization. It seeds the map from
 * the REST batch endpoint, subscribes to the org's realtime channel, and merges
 * `device:presence` pushes so every screen view shares one source of truth
 * without each one polling. Re-seeds on (re)connect to recover missed events.
 */
export function PresenceProvider({ children }: { children: ReactNode }) {
  const organizationId = useOrganizationStore(
    (state) => state.activeOrganizationId,
  )
  // Presence is tagged with the org it belongs to, so switching orgs hides the
  // stale map immediately (in render) without a synchronous effect reset.
  const [state, setState] = useState<{ orgId: string | null; map: PresenceMap }>(
    { orgId: null, map: {} },
  )
  // Avoid clobbering a fresh socket update with a slower in-flight seed.
  const latestSeedToken = useRef(0)

  useEffect(() => {
    if (!organizationId) {
      return
    }

    const socket = getRealtimeSocket()
    let cancelled = false

    const seed = async () => {
      const token = ++latestSeedToken.current
      try {
        const map = await screensApi.listDevicePresence()
        if (!cancelled && token === latestSeedToken.current) {
          setState({ orgId: organizationId, map })
        }
      } catch {
        // Presence is best-effort; the socket will still deliver live updates.
      }
    }

    const onConnect = () => {
      watchOrganization(organizationId)
      void seed()
    }

    if (socket.connected) {
      onConnect()
    }
    socket.on('connect', onConnect)

    const off = onDevicePresence((event: DevicePresenceEvent) => {
      setState((current) => {
        const map = current.orgId === organizationId ? current.map : {}

        // Unpaired: drop the entry entirely so every view flips to "no device".
        if (event.paired === false) {
          if (!(event.screenId in map)) {
            return current
          }
          const rest = Object.fromEntries(
            Object.entries(map).filter(([id]) => id !== event.screenId),
          )
          return { orgId: organizationId, map: rest }
        }

        const previous = map[event.screenId]
        return {
          orgId: organizationId,
          map: {
            ...map,
            [event.screenId]: {
              paired: true,
              online: event.online,
              deviceId: event.deviceId,
              lastSeenAt: event.lastSeenAt,
              ...(previous?.profile || event.appVersion
                ? {
                    profile: {
                      ...previous?.profile,
                      ...(event.appVersion
                        ? { appVersion: event.appVersion }
                        : {}),
                    },
                  }
                : {}),
            },
          },
        }
      })
    })

    return () => {
      cancelled = true
      socket.off('connect', onConnect)
      off()
    }
  }, [organizationId])

  const value = useMemo<PresenceMap>(
    () => (state.orgId === organizationId ? state.map : {}),
    [state, organizationId],
  )

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  )
}
