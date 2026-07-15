import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  aiGenerationQueryKey,
  aiGenerationsListQueryKey,
} from '../lib/aiGeneratorQueryKeys'
import { useAiGeneratorStore } from '../store/aiGeneratorStore'

import { useAuthStore } from '@/features/auth/store/authStore'
import { useOrganizationStore } from '@/features/organizations/store/organizationStore'
import {
  getRealtimeSocket,
  onAiContentChanged,
  watchOrganization,
} from '@/lib/realtime'


/**
 * App-wide listener that keeps the generation history live and notifies the
 * initiator when one of THEIR generations finishes — even if the drawer is
 * closed. Mounted once in the authed shell. Joins the org room itself (the
 * presence provider only does so on the screens page), and toasts only for
 * generations owned by the current user (the event carries the owner's id).
 */
export function useAiGenerationNotifications() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const organizationId = useOrganizationStore(
    (state) => state.activeOrganizationId,
  )
  const openGeneration = useAiGeneratorStore((state) => state.openGeneration)

  useEffect(() => {
    if (!organizationId) {
      return
    }

    const socket = getRealtimeSocket()
    watchOrganization(organizationId)

    const off = onAiContentChanged((event) => {
      // Keep the history list and the specific job fresh for everyone in the org.
      void queryClient.invalidateQueries({
        queryKey: aiGenerationsListQueryKey(organizationId),
      })
      void queryClient.invalidateQueries({
        queryKey: aiGenerationQueryKey(organizationId, event.generationId),
      })

      // Only notify the person who started this generation.
      if (event.userId !== useAuthStore.getState().user?.id) {
        return
      }
      if (event.status === 'succeeded') {
        toast.success(t('aiGenerator.notify.ready'), {
          action: {
            label: t('aiGenerator.notify.view'),
            onClick: () => {
              openGeneration(event.generationId)
            },
          },
        })
      } else if (event.status === 'failed') {
        toast.error(t('aiGenerator.notify.failed'))
      }
    })

    const onConnect = () => {
      watchOrganization(organizationId)
    }
    socket.on('connect', onConnect)

    return () => {
      off()
      socket.off('connect', onConnect)
    }
  }, [organizationId, queryClient, t, openGeneration])
}
