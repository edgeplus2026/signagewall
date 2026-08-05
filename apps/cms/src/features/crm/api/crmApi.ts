import type {
  CrmLead,
  CrmLeadStatus,
  CrmLeadType,
  CrmOverview,
  PaginatedCrmLeads,
  UpdateCrmLeadPayload,
} from '@/features/crm/types/crm.types'
import { api } from '@/lib/axios'

const CRM_BASE = '/crm/admin/leads'

export interface ListCrmLeadsParams {
  page?: number
  limit?: number
  status?: CrmLeadStatus
  type?: CrmLeadType
  search?: string
}

export const crmApi = {
  overview: async (): Promise<CrmOverview> => {
    const { data } = await api.get<CrmOverview>(`${CRM_BASE}/overview`)
    return data
  },

  list: async (params: ListCrmLeadsParams = {}): Promise<PaginatedCrmLeads> => {
    const { data } = await api.get<PaginatedCrmLeads>(CRM_BASE, { params })
    return data
  },

  update: async (leadId: string, payload: UpdateCrmLeadPayload): Promise<CrmLead> => {
    const { data } = await api.patch<CrmLead>(`${CRM_BASE}/${leadId}`, payload)
    return data
  },
}
