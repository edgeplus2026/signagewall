import { CalendarClock } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { BreadcrumbItem } from '@/components/layout/page-header/types'
import { usePageBreadcrumb } from '@/components/layout/page-header/usePageBreadcrumb'

interface ScheduleBreadcrumbProps {
  scheduleName?: string | undefined
}

export function ScheduleBreadcrumb({ scheduleName }: ScheduleBreadcrumbProps) {
  const { t } = useTranslation()

  const breadcrumb = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      {
        kind: 'link',
        label: t('schedules.breadcrumb.root'),
        href: '/schedules',
        icon: CalendarClock,
      },
    ]
    if (scheduleName) {
      items.push({ kind: 'current', label: scheduleName })
    }
    return items
  }, [scheduleName, t])

  usePageBreadcrumb(breadcrumb)

  return null
}
