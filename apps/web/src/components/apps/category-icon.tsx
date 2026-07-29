/* eslint-disable react-hooks/static-components --
   Nothing is created here: CATEGORY_ICONS holds stable module-level Lucide
   components and `categoryIcon` only looks one up. Same exemption, and same
   reasoning, as `solution-icon.tsx`. */
import { categoryIcon } from '@/lib/category-icons'

/** Resolves an app category's slug to its Lucide icon and renders it. */
export function CategoryIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = categoryIcon(slug)
  return <Icon className={className} />
}
