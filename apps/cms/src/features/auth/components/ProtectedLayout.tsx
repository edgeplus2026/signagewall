import { Outlet } from 'react-router-dom'

import { AuthSessionGate } from '@/features/auth/components/AuthSessionGate'
import { ReConsentGate } from '@/features/legal/components/ReConsentGate'

export function ProtectedLayout() {
  return (
    <AuthSessionGate>
      <ReConsentGate>
        <Outlet />
      </ReConsentGate>
    </AuthSessionGate>
  )
}
