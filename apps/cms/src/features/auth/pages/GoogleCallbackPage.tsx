import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { authApi } from '@/features/auth/api/authApi'
import { useAuthStore } from '@/features/auth/store/authStore'

export default function GoogleCallbackPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setAuth = useAuthStore((state) => state.setAuth)

  useEffect(() => {
    const accessToken = searchParams.get('accessToken')
    const refreshToken = searchParams.get('refreshToken')

    if (!accessToken || !refreshToken) {
      void navigate('/login', {
        replace: true,
        state: { formError: t('auth.google.error') },
      })
      return
    }

    void (async () => {
      try {
        useAuthStore.getState().setTokens(accessToken, refreshToken)
        const user = await authApi.getUser()
        setAuth(user, accessToken, refreshToken)
        toast.success(t('auth.google.success'))
        void navigate('/dashboard', { replace: true })
      } catch {
        useAuthStore.getState().logout()
        void navigate('/login', {
          replace: true,
          state: { formError: t('auth.google.error') },
        })
      }
    })()
  }, [navigate, searchParams, setAuth, t])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="border-brand h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  )
}
