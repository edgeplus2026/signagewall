import { type FallbackProps } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-danger text-2xl font-medium">{t('errors.title')}</h1>
      <p className="text-secondary max-w-md">
        {error instanceof Error ? error.message : t('errors.unknown')}
      </p>
      <Button onClick={resetErrorBoundary}>{t('errors.retry')}</Button>
    </div>
  )
}
