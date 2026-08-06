import { AlertTriangleIcon, RotateCwIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

interface QueryErrorStateProps {
  onRetry?: (() => void) | undefined
  className?: string | undefined
}

/**
 * Failed-query fallback for list pages. Deliberately distinct from the empty
 * state: an API outage must never read as "you have no data yet".
 */
export function QueryErrorState({ onRetry, className }: QueryErrorStateProps) {
  const { t } = useTranslation()

  return (
    <Empty className={className ?? 'min-h-48 py-12'}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <AlertTriangleIcon aria-hidden />
        </EmptyMedia>
        <EmptyTitle>{t('common.loadError')}</EmptyTitle>
        <EmptyDescription>{t('common.loadErrorDescription')}</EmptyDescription>
      </EmptyHeader>
      {onRetry && (
        <EmptyContent>
          <Button variant="outline" onClick={onRetry}>
            <RotateCwIcon aria-hidden />
            {t('common.retry')}
          </Button>
        </EmptyContent>
      )}
    </Empty>
  )
}
