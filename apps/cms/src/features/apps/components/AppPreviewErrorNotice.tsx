import type { ConnectorErrorCode } from '@signagewall/apps-contract'
import { AlertTriangleIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface AppPreviewErrorNoticeProps {
  code: ConnectorErrorCode
}

/**
 * Operator-facing remediation banner over the live preview when the latest
 * connector fetch failed. The backend only ever emits one of the fixed
 * allowlisted codes (never raw provider errors), and each code maps to a
 * localized "what happened / what to do" pair here — so a failed Power BI or
 * Sheets setup is diagnosable without log access.
 */
export function AppPreviewErrorNotice({ code }: AppPreviewErrorNoticeProps) {
  const { t } = useTranslation()

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center p-2">
      <div className="pointer-events-auto flex max-w-full items-start gap-2 rounded-md bg-amber-950/90 px-3 py-2 text-amber-100 shadow-lg">
        <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="min-w-0 text-xs">
          <p className="font-semibold">
            {t(`apps.preview.errors.${code}.title`, {
              defaultValue: t('apps.preview.errors.upstream_error.title'),
            })}
          </p>
          <p className="text-amber-200/90">
            {t(`apps.preview.errors.${code}.hint`, {
              defaultValue: t('apps.preview.errors.upstream_error.hint'),
            })}
          </p>
        </div>
      </div>
    </div>
  )
}
