import { useEffect, useRef } from 'react'
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
  // React 18 StrictMode mounts effects twice in dev; the exchange code is
  // single-use, so the second run must not fire another redeem.
  const hasExchanged = useRef(false)

  useEffect(() => {
    if (hasExchanged.current) {
      return
    }
    hasExchanged.current = true
    // The backend redirects with a single-use code the page redeems via POST,
    // so the JWTs never appear in the URL. `code` is the ONLY accepted shape:
    // accepting tokens straight from the query string would let anyone hand a
    // signed-in user a link that silently swaps their session for someone
    // else's, which is exactly what the exchange flow exists to prevent.
    const code = searchParams.get('code')

    if (!code) {
      void navigate('/login', {
        replace: true,
        state: { formError: t('auth.google.error') },
      })
      return
    }

    void (async () => {
      try {
        const { user, tokens } = await authApi.exchangeGoogleCode(code)
        setAuth(user, tokens.accessToken, tokens.refreshToken)
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
