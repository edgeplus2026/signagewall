import { ChevronRightIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { getBreadcrumbLabelDisplay } from '@/components/layout/page-header/truncateBreadcrumbLabel'
import type { BreadcrumbItem } from '@/components/layout/page-header/types'
import { Button } from '@/components/ui/button'

interface BreadcrumbNavProps {
  items: BreadcrumbItem[]
}

export function BreadcrumbNav({ items }: BreadcrumbNavProps) {
  const { t } = useTranslation()

  if (items.length === 0) {
    return null
  }

  return (
    <nav
      aria-label={t('layout.breadcrumb.label')}
      className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-sm"
    >
      {items.map((item, index) => {
        const isFirst = index === 0

        if (item.kind === 'link') {
          const Icon = item.icon
          const { displayLabel, title } = getBreadcrumbLabelDisplay(item.label)

          return (
            <div key={`${item.kind}-${item.href}-${item.label}`} className="flex min-w-0 items-center gap-1">
              {!isFirst ? (
                <ChevronRightIcon className="size-3.5 shrink-0 text-secondary" />
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 max-w-40 gap-1.5 truncate px-2 text-secondary hover:text-primary"
                asChild
              >
                <Link to={item.href} title={title}>
                  {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
                  {displayLabel}
                </Link>
              </Button>
            </div>
          )
        }

        if (item.kind === 'action') {
          const Icon = item.icon
          const { displayLabel, title } = getBreadcrumbLabelDisplay(item.label)

          return (
            <div key={`${item.kind}-${item.label}-${String(index)}`} className="flex min-w-0 items-center gap-1">
              <ChevronRightIcon className="size-3.5 shrink-0 text-secondary" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 max-w-40 gap-1.5 truncate px-2 text-secondary hover:text-primary"
                onClick={item.onClick}
                title={title}
              >
                {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
                {displayLabel}
              </Button>
            </div>
          )
        }

        const { displayLabel, title } = getBreadcrumbLabelDisplay(item.label)

        return (
          <div key={`${item.kind}-${item.label}`} className="flex min-w-0 items-center gap-1">
            <ChevronRightIcon className="size-3.5 shrink-0 text-secondary" />
            <span
              className="text-primary max-w-40 truncate px-1 font-medium"
              title={title}
            >
              {displayLabel}
            </span>
          </div>
        )
      })}
    </nav>
  )
}
