import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { VerifyEmailForm } from '@/features/auth/components/VerifyEmailForm'

export default function VerifyEmailPage() {
  return (
    <AuthLayout>
      <VerifyEmailForm />
    </AuthLayout>
  )
}
