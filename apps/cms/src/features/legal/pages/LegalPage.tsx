import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { legalApi } from '@/features/legal/api/legalApi'
import { LegalMarkdown } from '@/features/legal/components/LegalMarkdown'
import type { LegalDocType } from '@/features/legal/types/legal.types'

interface LegalPageProps {
  docType: LegalDocType
}

/** Public, standalone Terms/Privacy page (linked from register + settings). */
export default function LegalPage({ docType }: LegalPageProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.startsWith('sr') ? 'sr' : 'en'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['legal', 'documents', locale],
    queryFn: () => legalApi.getDocuments(locale),
  })

  const doc = data?.find((item) => item.type === docType)

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <Link
        to="/register"
        className="text-secondary hover:text-primary inline-flex w-fit items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        {t('legal.back')}
      </Link>

      {isLoading ? (
        <p className="text-secondary text-sm">{t('common.loading')}</p>
      ) : isError || !doc ? (
        <p className="text-secondary text-sm">{t('legal.loadError')}</p>
      ) : (
        <>
          <LegalMarkdown body={doc.body} />
          <p className="text-secondary border-secondary/60 mt-2 border-t pt-4 text-xs">
            {t('legal.version', {
              version: doc.version,
              date: doc.effectiveDate,
            })}
          </p>
        </>
      )}
    </div>
  )
}
