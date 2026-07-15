import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { aiGenerationQueryKey } from '../lib/aiGeneratorQueryKeys'

import { useOrganizationStore } from '@/features/organizations/store/organizationStore'
import {
  getRealtimeSocket,
  onAiContentChanged,
  watchOrganization,
} from '@/lib/realtime'


/**
 * Refetches the active generation the instant the server broadcasts that it
 * changed (mirrors `useNotificationsRealtime`). Also re-syncs on socket
 * (re)connect to recover any event missed while disconnected. No-op when there's
 * no active generation.
 */
export function useAiContentRealtime(generationId: string | null) {
  const queryClient = useQueryClient()
  const organizationId = useOrganizationStore(
    (state) => state.activeOrganizationId,
  )

  useEffect(() => {
    if (!generationId || !organizationId) {
      return
    }

    const socket = getRealtimeSocket()
    // Make sure this socket is in the org room the event is sent to. Idempotent —
    // the presence provider joins it globally too.
    watchOrganization(organizationId)

    const invalidate = () => {
      void queryClient.invalidateQueries({
        queryKey: aiGenerationQueryKey(organizationId, generationId),
      })
    }

    const off = onAiContentChanged((event) => {
      if (event.generationId === generationId) {
        invalidate()
      }
    })
    const onConnect = () => {
      watchOrganization(organizationId)
      invalidate()
    }
    socket.on('connect', onConnect)

    return () => {
      off()
      socket.off('connect', onConnect)
    }
  }, [generationId, organizationId, queryClient])
}
