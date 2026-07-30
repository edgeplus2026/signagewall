export type LegalDocType = 'tos' | 'privacy'

export interface LegalAcceptanceStatus {
  needsReconsent: boolean
  pending: { type: LegalDocType; version: string }[]
}
