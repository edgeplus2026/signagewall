import type { PageBreadcrumbValue } from '@/components/layout/page-header/types'

export function serializeBreadcrumbValue(value: PageBreadcrumbValue | undefined) {
  if (value === 'hidden') {
    return 'hidden'
  }

  if (!value) {
    return 'default'
  }

  return value
    .map((item) => {
      if (item.kind === 'link') {
        return `link:${item.label}:${item.href}`
      }

      if (item.kind === 'action') {
        return `action:${item.label}`
      }

      return `current:${item.label}`
    })
    .join('|')
}
