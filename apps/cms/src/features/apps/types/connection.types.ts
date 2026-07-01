export type ConnectionProvider = 'google' | 'microsoft' | 'canva'

/** A connected third-party account (token-free view). */
export interface Connection {
  id: string
  provider: ConnectionProvider
  accountLabel: string
  scopes: string[]
  createdAt: string
}

/** A Canva design surfaced in the config-form picker (token-free). */
export interface CanvaDesign {
  id: string
  title: string
  thumbnailUrl?: string
}
