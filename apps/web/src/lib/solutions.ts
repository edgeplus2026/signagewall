import { Building2, Dumbbell, HeartPulse, Hotel, ShoppingBag, Utensils } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const INDUSTRY_ORDER = [
  'hospitality',
  'retail',
  'office',
  'healthcare',
  'hotels',
  'gyms',
] as const

export type Industry = (typeof INDUSTRY_ORDER)[number]

export const INDUSTRY_ICONS: Record<Industry, LucideIcon> = {
  hospitality: Utensils,
  retail: ShoppingBag,
  office: Building2,
  healthcare: HeartPulse,
  hotels: Hotel,
  gyms: Dumbbell,
}

export function isIndustry(value: string): value is Industry {
  return (INDUSTRY_ORDER as readonly string[]).includes(value)
}
