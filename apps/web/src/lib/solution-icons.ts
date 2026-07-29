import {
  Building2,
  BusFront,
  Car,
  Clapperboard,
  Croissant,
  Dumbbell,
  Factory,
  GraduationCap,
  HeartPulse,
  Hotel,
  KeyRound,
  Landmark,
  Laptop,
  PartyPopper,
  PawPrint,
  Pill,
  Scissors,
  ShoppingBag,
  ShoppingCart,
  Utensils,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Industry → icon. Kept out of Payload because a component can't live in Mongo;
 * the collection stores the key and this map resolves it. Import-light on
 * purpose so the collection config (which runs in the Payload build) can read
 * the key list without pulling React in.
 */
export const SOLUTION_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  'shopping-bag': ShoppingBag,
  building: Building2,
  'heart-pulse': HeartPulse,
  hotel: Hotel,
  dumbbell: Dumbbell,
  'graduation-cap': GraduationCap,
  landmark: Landmark,
  pill: Pill,
  car: Car,
  'key-round': KeyRound,
  scissors: Scissors,
  croissant: Croissant,
  clapperboard: Clapperboard,
  bus: BusFront,
  factory: Factory,
  laptop: Laptop,
  'paw-print': PawPrint,
  'shopping-cart': ShoppingCart,
  'party-popper': PartyPopper,
}

export const SOLUTION_ICON_KEYS = Object.keys(SOLUTION_ICONS)

export function solutionIcon(key: string | null | undefined): LucideIcon {
  return SOLUTION_ICONS[key ?? ''] ?? Building2
}
