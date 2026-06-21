import { RocketIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { BreadcrumbItem } from '@/components/layout/page-header/types'
import { usePageBreadcrumb } from '@/components/layout/page-header/usePageBreadcrumb'

interface AppsBreadcrumbProps {
  app?: { id: string; name: string } | undefined
  /** When set, the app becomes a link and this instance is the current crumb. */
  instanceName?: string | undefined
}

export function AppsBreadcrumb({ app, instanceName }: AppsBreadcrumbProps) {
  const { t } = useTranslation()

  const breadcrumb = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      {
        kind: 'link',
        label: t('apps.breadcrumb.root'),
        href: '/apps',
        icon: RocketIcon,
      },
    ]

    if (app) {
      if (instanceName) {
        items.push({
          kind: 'link',
          label: app.name,
          href: `/apps/${app.id}/instances`,
        })
        items.push({ kind: 'current', label: instanceName })
      } else {
        items.push({ kind: 'current', label: app.name })
      }
    }

    return items
  }, [app, instanceName, t])

  usePageBreadcrumb(breadcrumb)

  return null
}
