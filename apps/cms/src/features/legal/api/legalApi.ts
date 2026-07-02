import type {
  LegalAcceptanceStatus,
  LegalDocType,
  LegalDocument,
} from '@/features/legal/types/legal.types'
import { api } from '@/lib/axios'

const BASE = '/legal'

export const legalApi = {
  /** Public: current Terms/Privacy documents for a locale. */
  getDocuments: async (locale: string): Promise<LegalDocument[]> => {
    const { data } = await api.get<LegalDocument[]>(`${BASE}/documents`, {
      params: { locale },
    })
    return data
  },

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
