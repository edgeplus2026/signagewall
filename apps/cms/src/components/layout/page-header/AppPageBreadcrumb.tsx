import { useTranslation } from 'react-i18next'
import { useMatches, type UIMatch } from 'react-router-dom'

import { BreadcrumbNav } from '@/components/layout/page-header/BreadcrumbNav'
import { usePageHeader } from '@/components/layout/page-header/PageHeaderContext'
import type { BreadcrumbItem } from '@/components/layout/page-header/types'
import type { RouteHandle } from '@/router/types'

/**
 * `handle` is genuinely absent on routes that declare none, so it is typed
 * optional here. Claiming otherwise made the `?.` guards below look redundant
 * to the linter while they were in fact the only thing preventing a crash.
 */
type AppUIMatch = UIMatch<unknown, RouteHandle | undefined>

export function AppPageBreadcrumb() {
  const { t } = useTranslation()
  const { breadcrumbOverride } = usePageHeader()
  const matches = useMatches() as AppUIMatch[]

  if (breadcrumbOverride === 'hidden') {
    return null
  }

  if (breadcrumbOverride) {
    return <BreadcrumbNav items={breadcrumbOverride} />
  }

  const match = [...matches].reverse().find((item) => item.handle?.breadcrumb)

  if (!match?.handle?.breadcrumb) {
    return null
  }

  const items: BreadcrumbItem[] = [
    {
      kind: 'current',
      label: t(match.handle.breadcrumb.labelKey),
    },
  ]

  return <BreadcrumbNav items={items} />
}
