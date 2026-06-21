import { MonitorIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { BreadcrumbItem } from '@/components/layout/page-header/types'
import { usePageBreadcrumb } from '@/components/layout/page-header/usePageBreadcrumb'

interface ScreenBreadcrumbProps {
  screenName?: string | undefined
}

export function ScreenBreadcrumb({ screenName }: ScreenBreadcrumbProps) {
  const { t } = useTranslation()

  const breadcrumb = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      {
        kind: 'link',
        label: t('screens.breadcrumb.root'),
        href: '/screens',
        icon: MonitorIcon,
      },
    ]

    if (screenName) {
      items.push({
        kind: 'current',
        label: screenName,
      })
    }

    return items
  }, [screenName, t])

  usePageBreadcrumb(breadcrumb)

  return null
}
