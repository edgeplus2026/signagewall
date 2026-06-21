import { useEffect, useState } from 'react'

import { exitImpersonationSession } from '@/features/auth/lib/impersonation'
import { tokenHasImpersonator } from '@/features/auth/lib/jwt'
import { useAuthStore } from '@/features/auth/store/authStore'
import { queryClient } from '@/providers/QueryProvider'

export function useEnsureSuperAdminSession() {
  const token = useAuthStore((state) => state.token)
  const [isRecovering, setIsRecovering] = useState(() => tokenHasImpersonator(token))

  useEffect(() => {
    if (!tokenHasImpersonator(token)) {
      setIsRecovering(false)
      return
    }

    let cancelled = false

    void (async () => {
      setIsRecovering(true)
      const restored = await exitImpersonationSession()

      if (!cancelled) {
        if (restored) {
          await queryClient.invalidateQueries()
        }
        setIsRecovering(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token])

  return { isRecovering }
}
