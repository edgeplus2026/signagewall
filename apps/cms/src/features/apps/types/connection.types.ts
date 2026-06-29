export type ConnectionProvider = 'google' | 'microsoft'

/** A connected third-party account (token-free view). */
export interface Connection {
  id: string
  provider: ConnectionProvider
  accountLabel: string
  scopes: string[]
  createdAt: string
}
