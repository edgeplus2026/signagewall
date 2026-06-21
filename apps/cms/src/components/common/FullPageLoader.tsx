import { useTranslation } from 'react-i18next'

export function FullPageLoader() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="border-brand h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  )
}
