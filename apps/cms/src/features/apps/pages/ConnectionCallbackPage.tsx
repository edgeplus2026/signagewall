import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'

/**
 * Landing page the provider OAuth flow returns to (the backend redirects here
 * after exchanging the code). It just reports success/failure and refreshes the
 * connections cache; the user then returns to the app config to pick the new
 * account.
 */
export default function ConnectionCallbackPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const queryClient = useQueryClient()

  const status = params.get('status')
  const account = params.get('account')
  const ok = status === 'connected'

  useEffect(() => {
    if (ok) {
      // The connections list changed; drop cached copies so pickers refetch.
      void queryClient.invalidateQueries({ queryKey: ['apps'] })
    }
  }, [ok, queryClient])

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-lg font-semibold text-primary">
        {ok
          ? t('apps.connections.callbackSuccessTitle')
          : t('apps.connections.callbackErrorTitle')}
      </h1>
      <p className="text-sm text-secondary">
        {ok
          ? t('apps.connections.callbackSuccessBody', {
              account: account ?? '',
            })
          : t('apps.connections.callbackErrorBody')}
      </p>
      <Button asChild>
        <Link to="/apps">{t('apps.connections.backToApps')}</Link>
      </Button>
    </div>
  )
}
