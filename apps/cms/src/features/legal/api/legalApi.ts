import type { LegalAcceptanceStatus, LegalDocType } from '@/features/legal/types/legal.types'
import { api } from '@/lib/axios'

const BASE = '/legal'

/* No `getDocuments` here any more: the Terms and Privacy text is published on
   the marketing site (see `legalUrls`), and the backend only tracks the version
   number and who accepted it. `GET /legal/documents` still exists server-side. */

export const legalApi = {
  getAcceptanceStatus: async (): Promise<LegalAcceptanceStatus> => {
    const { data } = await api.get<LegalAcceptanceStatus>(
      `${BASE}/acceptance-status`,
    )
    return data
  },

  /** Accept the current version of the given documents (defaults to all pending). */
  accept: async (docTypes?: LegalDocType[]): Promise<LegalAcceptanceStatus> => {
    const { data } = await api.post<LegalAcceptanceStatus>(
      `${BASE}/accept`,
      docTypes ? { docTypes } : {},
    )
    return data
  },
}
