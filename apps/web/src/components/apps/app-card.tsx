import { AppIcon } from '@/components/apps/app-icon'
import { CatalogCard } from '@/components/ui/catalog-card'

export interface AppCardData {
  slug: string
  name: string
  tagline: string
  icon: string
}

/**
 * The app flavour of [CatalogCard] — the shared drawing, plus the app's inline
 * SVG icon and the `/apps/[slug]` link. Used by the catalogue grid and by
 * "related apps".
 */
export function AppCard({
  slug,
  name,
  tagline,
  icon,
  className,
}: AppCardData & { className?: string }) {
  return (
    <CatalogCard
      href={{ pathname: '/apps/[slug]', params: { slug } }}
      icon={<AppIcon svg={icon} className="size-6" />}
      name={name}
      tagline={tagline}
      className={className}
    />
  )
}
