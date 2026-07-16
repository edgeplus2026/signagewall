export type ConnectionProvider = 'google' | 'canva' | 'microsoft'

/** A connected third-party account (token-free view). */
export interface Connection {
  id: string
  provider: ConnectionProvider
  accountLabel: string
  scopes: string[]
  createdAt: string
}

/** A resource surfaced in a `remote-select` config field (Canva design, Google calendar…). */
export interface RemoteOption {
  id: string
  title: string
  thumbnailUrl?: string
}
