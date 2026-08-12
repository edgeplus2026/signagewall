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
 * Non-blocking refresh failure, for when the list already has data on screen.
 *
 * Replacing a rendered list with a full-page error throws away results the
 * operator can still act on — during a blip they lose the screen they were
 * halfway through editing. Cached data stays; this says it may be stale.
 */
export function QueryErrorBanner({ onRetry, className }: QueryErrorStateProps) {
  const { t } = useTranslation()

  return (
    <div
      role="status"
      className={
        className ??
        'border-warning/40 bg-warning/10 text-warning-foreground mb-3 flex items-center gap-2 rounded-md border px-3 py-2 text-sm'
      }
    >
      <AlertTriangleIcon className="size-4 shrink-0" aria-hidden />
      <span className="flex-1">{t('common.loadErrorStale')}</span>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          <RotateCwIcon aria-hidden />
          {t('common.retry')}
        </Button>
      )}
    </div>
  )
}

/**
 * Failed-query fallback for list pages. Deliberately distinct from the empty
 * state: an API outage must never read as "you have no data yet".
 *
 * Only use this when there is nothing cached to show — otherwise
 * {@link QueryErrorBanner}.
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
