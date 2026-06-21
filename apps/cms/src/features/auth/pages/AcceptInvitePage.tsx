import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'

import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { AcceptInviteDialog } from '@/features/auth/components/AcceptInviteDialog'
import { invitationsApi } from '@/features/auth/api/invitationsApi'
import { useAuthStore } from '@/features/auth/store/authStore'

function InviteLoader() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <div className="border-brand h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      <p className="text-secondary text-sm">{t('common.loading')}</p>
    </div>
  )
}

export default function AcceptInvitePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite') ?? undefined
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)

  const {
    data: preview,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['invitation', inviteToken],
    queryFn: () => invitationsApi.getPreview(inviteToken!),
    enabled: !!inviteToken && isAuthenticated,
    retry: false,
  })

  if (!inviteToken) {
    return <Navigate to="/dashboard" replace />
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?invite=${inviteToken}`} replace />
  }

  if (isLoading) {
    return (
      <AuthLayout>
        <InviteLoader />
      </AuthLayout>
    )
  }

  if (isError || !preview) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-2xl font-medium">{t('auth.acceptInvite.invalidTitle')}</h1>
          <p className="text-secondary text-sm text-balance">
            {t('auth.acceptInvite.invalidDescription')}
          </p>
          <Link to="/dashboard" className="text-sm underline underline-offset-4">
            {t('auth.acceptInvite.backToDashboard')}
          </Link>
        </div>
      </AuthLayout>
    )
  }

  if (!preview.accountExists) {
    return <Navigate to={`/register?invite=${inviteToken}`} replace />
  }

  if (user?.email.toLowerCase() !== preview.email.toLowerCase()) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-2xl font-medium">{t('auth.acceptInvite.wrongAccountTitle')}</h1>
          <p className="text-secondary text-sm text-balance">
            {t('auth.acceptInvite.wrongAccountDescription', { email: preview.email })}
          </p>
          <Link to="/dashboard" className="text-sm underline underline-offset-4">
            {t('auth.acceptInvite.backToDashboard')}
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <AcceptInviteDialog
        open
        inviteToken={inviteToken}
        preview={preview}
        onResolved={() => {
          void navigate('/dashboard', { replace: true })
        }}
      />
    </AuthLayout>
  )
}
