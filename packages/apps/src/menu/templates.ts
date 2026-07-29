import type { FieldOption } from '@signagewall/apps-contract'

/**
 * The designs the menu board can render in — the single source of truth shared
 * by the manifest (which offers them in the config form) and the embed (which
 * keys its template registry by them).
 *
 * Adding a design is deliberately a three-line change: add an entry here, add
 * the template file, register it in `embeds/menu/templates/index.ts`. The
 * registry is typed `Record<MenuTemplate, MenuTemplateImpl>`, so a design
 * listed here with no template behind it fails the type-check instead of
 * reaching a screen as a blank frame.
 */
export const MENU_TEMPLATES = [
  { value: 'classic', label: 'Classic — a refined price list' },
  { value: 'chalkboard', label: 'Chalkboard — a hand-written café board' },
  { value: 'gallery', label: 'Gallery — cards with photos' },
  { value: 'counter', label: 'Counter — a bold fast-food board' },
  { value: 'noir', label: 'Noir — understated luxury' },
] as const

/** The `template` config values, narrowed to the designs we actually ship. */
export type MenuTemplate = (typeof MENU_TEMPLATES)[number]['value']

export const DEFAULT_MENU_TEMPLATE: MenuTemplate = 'classic'

/** The design list as the `select` field's options. */
export function menuTemplateOptions(): FieldOption[] {
  return MENU_TEMPLATES.map((template) => ({
    label: template.label,
    value: template.value,
  }))
}
