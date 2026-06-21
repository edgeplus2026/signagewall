import { Outlet } from 'react-router-dom'

import { AuthSessionGate } from '@/features/auth/components/AuthSessionGate'

export function ProtectedLayout() {
  return (
    <AuthSessionGate>
      <Outlet />
    </AuthSessionGate>
  )
}
