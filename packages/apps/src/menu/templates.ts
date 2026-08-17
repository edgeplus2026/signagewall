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
  { value: 'classic', label: 'Classic. A refined price list' },
  { value: 'chalkboard', label: 'Chalkboard. A hand-written café board' },
  { value: 'counter', label: 'Counter. A bold fast-food board' },
] as const

/**
 * Designs that used to ship and no longer do. Kept so saved instances that named
 * one can be migrated to a design that exists — dropping a value out of
 * {@link MENU_TEMPLATES} makes it fail the config's `z.enum`, which would show an
 * operator "Invalid app configuration" on a board they never touched.
 */
export const RETIRED_MENU_TEMPLATES = ['gallery', 'noir'] as const

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
