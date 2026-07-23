import type { LucideIcon } from 'lucide-react'

export interface BreadcrumbLinkItem {
  kind: 'link'
  label: string
  href: string
  icon?: LucideIcon
}

export interface BreadcrumbActionItem {
  kind: 'action'
  label: string
  onClick: () => void
  icon?: LucideIcon
}

export interface BreadcrumbCurrentItem {
  kind: 'current'
  label: string
}

export type BreadcrumbItem =
  | BreadcrumbLinkItem
  | BreadcrumbActionItem
  | BreadcrumbCurrentItem

export type PageBreadcrumbValue = BreadcrumbItem[] | 'hidden' | null
