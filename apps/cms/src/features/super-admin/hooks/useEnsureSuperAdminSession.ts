import { useEffect, useState } from 'react'

import { exitImpersonationSession } from '@/features/auth/lib/impersonation'
import { tokenHasImpersonator } from '@/features/auth/lib/jwt'
import { useAuthStore } from '@/features/auth/store/authStore'
import { queryClient } from '@/providers/QueryProvider'

export function useEnsureSuperAdminSession() {
  const token = useAuthStore((state) => state.token)
  const hasImpersonator = tokenHasImpersonator(token)
  const [isRecovering, setIsRecovering] = useState(hasImpersonator)

  // Re-sync to a new token during render rather than from inside the effect —
  // React's documented alternative to a state-syncing effect, and it avoids a
  // frame where a freshly-restored session still reads as "recovering".
  const [prevToken, setPrevToken] = useState(token)
  if (prevToken !== token) {
    setPrevToken(token)
    setIsRecovering(hasImpersonator)
  }

  useEffect(() => {
    if (!tokenHasImpersonator(token)) {
      return
    }

    // An AbortController rather than a `let cancelled = false` flag: the flag
    // reads as permanently `false` to TypeScript's flow analysis (the only
    // write is in the cleanup closure), so every check against it looked dead.
    const controller = new AbortController()

    void (async () => {
      setIsRecovering(true)
      const restored = await exitImpersonationSession()

      if (!controller.signal.aborted) {
        if (restored) {
          await queryClient.invalidateQueries()
        }
        setIsRecovering(false)
      }
    })()

    return () => {
      controller.abort()
    }
  }, [token])

  return { isRecovering }
}
