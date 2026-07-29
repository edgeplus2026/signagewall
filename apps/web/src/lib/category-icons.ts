import {
  CalendarClock,
  Clock,
  CloudSun,
  Gauge,
  LayoutGrid,
  Megaphone,
  Newspaper,
  Presentation,
  Share2,
  TrendingUp,
  Utensils,
  Video,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * App-category slug → icon. Keyed by slug rather than by position, because the
 * taxonomy lives in `@signagewall/apps` and an index-keyed list silently mislabels
 * every category the moment one is inserted or reordered there.
 */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  announcements: Megaphone,
  presentations: Presentation,
  video: Video,
  dashboards: Gauge,
  workplace: CalendarClock,
  social: Share2,
  news: Newspaper,
  weather: CloudSun,
  finance: TrendingUp,
  time: Clock,
  menus: Utensils,
}

export function categoryIcon(slug: string): LucideIcon {
  return CATEGORY_ICONS[slug] ?? LayoutGrid
}
