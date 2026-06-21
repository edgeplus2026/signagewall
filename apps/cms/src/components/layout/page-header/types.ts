import type { LucideIcon } from 'lucide-react'

export type BreadcrumbLinkItem = {
  kind: 'link'
  label: string
  href: string
  icon?: LucideIcon
}

export type BreadcrumbActionItem = {
  kind: 'action'
  label: string
  onClick: () => void
  icon?: LucideIcon
}

export type BreadcrumbCurrentItem = {
  kind: 'current'
  label: string
}

export type BreadcrumbItem =
  | BreadcrumbLinkItem
  | BreadcrumbActionItem
  | BreadcrumbCurrentItem

export type PageBreadcrumbValue = BreadcrumbItem[] | 'hidden' | null
