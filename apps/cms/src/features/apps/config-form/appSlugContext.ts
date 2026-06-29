import { createContext, useContext } from 'react'

/**
 * The slug of the app whose config form is being rendered. The `oauth` control
 * needs it to start the provider OAuth flow for the right app; other controls
 * ignore it. Provided by {@link SchemaForm}.
 */
const AppSlugContext = createContext<string | null>(null)

export const AppSlugProvider = AppSlugContext.Provider

export function useAppSlug(): string | null {
  return useContext(AppSlugContext)
}
