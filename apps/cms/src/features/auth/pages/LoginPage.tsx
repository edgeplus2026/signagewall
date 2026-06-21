import { Navigate, useSearchParams } from 'react-router-dom'

import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { useAuthStore } from '@/features/auth/store/authStore'

export default function LoginPage() {
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite') ?? undefined
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (isAuthenticated) {
    return (
      <Navigate
        to={inviteToken ? `/accept-invite?invite=${inviteToken}` : '/dashboard'}
        replace
      />
    )
  }

  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  )
}
