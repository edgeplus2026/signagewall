import { createContext, useContext } from 'react'

/**
 * The full current config values of the form being rendered. A control that
 * depends on a sibling field reads it here (e.g. `remote-select` needs the
 * chosen `connectionId` to know which connection to query). Most controls ignore
 * it. Provided by {@link SchemaForm}.
 */
const ConfigValuesContext = createContext<Record<string, unknown>>({})

export const ConfigValuesProvider = ConfigValuesContext.Provider

export function useConfigValues(): Record<string, unknown> {
  return useContext(ConfigValuesContext)
}
