export type CrmLeadType = 'contact' | 'quote'

export type CrmLeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost' | 'spam'

export type CrmLeadEmailStatus = 'pending' | 'sent' | 'skipped' | 'failed'

export interface CrmAttributionTouch {
  source?: string
  medium?: string
  campaign?: string
  term?: string
  content?: string
  clickId?: string
  landingPath?: string
  referrerDomain?: string
  locale?: string
  occurredAt?: string
}

export interface CrmLead {
  id: string
  type: CrmLeadType
  status: CrmLeadStatus
  name: string
  email: string
  phone?: string
  company?: string
  message: string
  screenQuantity?: number
  city?: string
  country?: string
  locale?: string
  anonymousId?: string
  firstTouch?: CrmAttributionTouch
  lastTouch?: CrmAttributionTouch
  emailNotificationStatus: CrmLeadEmailStatus
  emailNotificationAt: string | null
  statusHistory: {
    status: CrmLeadStatus
    actorUserId: string | null
    occurredAt: string
  }[]
  internalNotes: {
    actorUserId: string
    text: string
    createdAt: string
  }[]
  createdAt: string
  updatedAt: string
}

export interface PaginatedCrmLeads {
  items: CrmLead[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CrmOverview {
  total: number
  byStatus: Record<CrmLeadStatus, number>
}

export interface UpdateCrmLeadPayload {
  status?: CrmLeadStatus
  note?: string
}
