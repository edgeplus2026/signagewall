import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { billingApi } from '@/features/billing/api/billingApi'
import type {
  ManualInvoicePayload,
  ManualInvoiceStatus,
  UpdateManualInvoicePayload,
} from '@/features/billing/types/billing.types'

const BILLING_QUERY_KEY = ['admin', 'billing'] as const
const INVOICES_QUERY_KEY = [...BILLING_QUERY_KEY, 'invoices'] as const
const OVERVIEW_QUERY_KEY = [...BILLING_QUERY_KEY, 'overview'] as const
const EXCEPTIONS_QUERY_KEY = [...BILLING_QUERY_KEY, 'exceptions'] as const

const invalidateBilling = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY })
  void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
  void queryClient.invalidateQueries({ queryKey: ['admin', 'upgrade-requests'] })
}

export function useBillingOverview() {
  return useQuery({
    queryKey: OVERVIEW_QUERY_KEY,
    queryFn: billingApi.overview,
    refetchInterval: 60_000,
  })
}

export function useBillingExceptions() {
  return useQuery({
    queryKey: EXCEPTIONS_QUERY_KEY,
    queryFn: billingApi.exceptions,
    refetchInterval: 60_000,
  })
}

export function useManualInvoices(params: {
  page: number
  limit?: number
  status?: ManualInvoiceStatus
}) {
  const { page, limit = 20, status } = params

  return useQuery({
    queryKey: [...INVOICES_QUERY_KEY, page, limit, status],
    queryFn: () => billingApi.listInvoices({ page, limit, ...(status ? { status } : {}) }),
    placeholderData: keepPreviousData,
  })
}

export function useCreateManualInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ManualInvoicePayload) => billingApi.createInvoice(payload),
    onSuccess: () => {
      invalidateBilling(queryClient)
    },
  })
}

export function useUpdateManualInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      invoiceId,
      payload,
    }: {
      invoiceId: string
      payload: UpdateManualInvoicePayload
    }) => billingApi.updateInvoice(invoiceId, payload),
    onSuccess: () => {
      invalidateBilling(queryClient)
    },
  })
}

export function useMarkInvoiceSent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: billingApi.markSent,
    onSuccess: () => {
      invalidateBilling(queryClient)
    },
  })
}

export function useMarkInvoicePaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      invoiceId,
      paymentReference,
    }: {
      invoiceId: string
      paymentReference: string
    }) => billingApi.markPaid(invoiceId, { paymentReference }),
    onSuccess: () => {
      invalidateBilling(queryClient)
    },
  })
}

export function useVoidInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, reason }: { invoiceId: string; reason: string }) =>
      billingApi.voidInvoice(invoiceId, reason),
    onSuccess: () => {
      invalidateBilling(queryClient)
    },
  })
}

export function useArchiveInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: billingApi.archiveInvoice,
    onSuccess: () => {
      invalidateBilling(queryClient)
    },
  })
}
