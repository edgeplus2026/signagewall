export const DEFAULT_APP_COLOR = '#5b5bd6'

/** Resolve a usable colour, treating empty/blank as the default. */
export function resolveAppColor(color: string | undefined): string {
  if (color && color.trim().length > 0) return color
  return DEFAULT_APP_COLOR
}
