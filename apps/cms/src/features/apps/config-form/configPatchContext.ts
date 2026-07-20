import { createContext, useContext } from 'react'

/**
 * Multi-key config writes for controls whose one action touches several fields
 * at once — e.g. the tabular preview's "convert to manual" (copies synced rows
 * into the repeater AND flips `source`), or a CSV import that fills the rows.
 * The patch is merged over the current values in one `onChange`, so it can't
 * race a per-field write. Provided by {@link SchemaForm}; null outside a form.
 */
const ConfigPatchContext = createContext<((patch: Record<string, unknown>) => void) | null>(null)

export const ConfigPatchProvider = ConfigPatchContext.Provider

export function useConfigPatch(): ((patch: Record<string, unknown>) => void) | null {
  return useContext(ConfigPatchContext)
}
