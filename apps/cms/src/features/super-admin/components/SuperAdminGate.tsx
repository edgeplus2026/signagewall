import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuthStore } from '@/features/auth/store/authStore'

export function SuperAdminGate({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user)
  const impersonationActive = useAuthStore((state) => state.impersonationActive)

  if (user?.isSuperAdmin !== true || impersonationActive) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
