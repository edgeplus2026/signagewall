import { createContext, useContext } from 'react'

/**
 * The id of the app instance whose config form is being rendered. The `oauth`
 * control needs it to start/disconnect the per-instance OAuth connection. Most
 * controls ignore it. Provided by {@link SchemaForm}.
 */
const InstanceIdContext = createContext<string | null>(null)

export const InstanceIdProvider = InstanceIdContext.Provider

export function useInstanceId(): string | null {
  return useContext(InstanceIdContext)
}
