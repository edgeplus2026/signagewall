import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { crmApi } from '@/features/crm/api/crmApi'
import type {
  CrmLeadStatus,
  CrmLeadType,
  UpdateCrmLeadPayload,
} from '@/features/crm/types/crm.types'

const CRM_QUERY_KEY = ['admin', 'crm'] as const

export function useCrmOverview() {
  return useQuery({
    queryKey: [...CRM_QUERY_KEY, 'overview'],
    queryFn: crmApi.overview,
    refetchInterval: 60_000,
  })
}

export function useCrmLeads(params: {
  page: number
  limit?: number
  status?: CrmLeadStatus
  type?: CrmLeadType
  search?: string
}) {
  const { page, limit = 20, status, type, search } = params

  return useQuery({
    queryKey: [...CRM_QUERY_KEY, 'leads', page, limit, status, type, search],
    queryFn: () =>
      crmApi.list({
        page,
        limit,
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
        ...(search ? { search } : {}),
      }),
    placeholderData: keepPreviousData,
  })
}

export function useUpdateCrmLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ leadId, payload }: { leadId: string; payload: UpdateCrmLeadPayload }) =>
      crmApi.update(leadId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEY })
    },
  })
}
