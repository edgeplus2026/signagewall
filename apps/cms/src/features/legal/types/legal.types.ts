export type LegalDocType = 'tos' | 'privacy'

export interface LegalDocument {
  type: LegalDocType
  version: string
  effectiveDate: string
  title: string
  /** Markdown body. */
  body: string
}

export interface LegalAcceptanceStatus {
  needsReconsent: boolean
  pending: { type: LegalDocType; version: string }[]
}
