import type {
  BillingException,
  BillingOverview,
  ManualInvoice,
  ManualInvoicePayload,
  ManualInvoiceStatus,
  PaginatedManualInvoices,
  UpdateManualInvoicePayload,
} from '@/features/billing/types/billing.types'
import { api } from '@/lib/axios'

const BILLING_BASE = '/admin/billing'

export interface ListManualInvoicesParams {
  page?: number
  limit?: number
  status?: ManualInvoiceStatus
}

export const billingApi = {
  overview: async (): Promise<BillingOverview> => {
    const { data } = await api.get<BillingOverview>(`${BILLING_BASE}/overview`)
    return data
  },

  exceptions: async (): Promise<BillingException[]> => {
    const { data } = await api.get<BillingException[]>(`${BILLING_BASE}/exceptions`)
    return data
  },

  listInvoices: async (params: ListManualInvoicesParams = {}): Promise<PaginatedManualInvoices> => {
    const { data } = await api.get<PaginatedManualInvoices>(`${BILLING_BASE}/invoices`, {
      params,
    })
    return data
  },

  createInvoice: async (payload: ManualInvoicePayload): Promise<ManualInvoice> => {
    const { data } = await api.post<ManualInvoice>(`${BILLING_BASE}/invoices`, payload)
    return data
  },

  updateInvoice: async (
    invoiceId: string,
    payload: UpdateManualInvoicePayload,
  ): Promise<ManualInvoice> => {
    const { data } = await api.patch<ManualInvoice>(
      `${BILLING_BASE}/invoices/${invoiceId}`,
      payload,
    )
    return data
  },

  markSent: async (invoiceId: string): Promise<ManualInvoice> => {
    const { data } = await api.post<ManualInvoice>(
      `${BILLING_BASE}/invoices/${invoiceId}/mark-sent`,
    )
    return data
  },

  markPaid: async (
    invoiceId: string,
    payload: { paymentReference: string; paidAt?: string },
  ): Promise<ManualInvoice> => {
    const { data } = await api.post<ManualInvoice>(
      `${BILLING_BASE}/invoices/${invoiceId}/mark-paid`,
      payload,
    )
    return data
  },

  voidInvoice: async (invoiceId: string, reason: string): Promise<ManualInvoice> => {
    const { data } = await api.post<ManualInvoice>(`${BILLING_BASE}/invoices/${invoiceId}/void`, {
      reason,
    })
    return data
  },

  archiveInvoice: async (invoiceId: string): Promise<ManualInvoice> => {
    const { data } = await api.delete<ManualInvoice>(`${BILLING_BASE}/invoices/${invoiceId}`)
    return data
  },
}
