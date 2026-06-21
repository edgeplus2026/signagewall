import type {
  CreateOrganizationRequest,
  Organization,
  UpdateOrganizationRequest,
} from '@/features/organizations/types/organization.types'
import { api } from '@/lib/axios'

const ORGANIZATIONS_BASE = '/organizations'

export const organizationApi = {
  list: async (): Promise<Organization[]> => {
    const { data } = await api.get<Organization[]>(ORGANIZATIONS_BASE)
    return data
  },

  create: async (payload: CreateOrganizationRequest): Promise<Organization> => {
    const { data } = await api.post<Organization>(ORGANIZATIONS_BASE, payload)
    return data
  },

  update: async (
    id: string,
    payload: UpdateOrganizationRequest,
  ): Promise<Organization> => {
    const { data } = await api.patch<Organization>(
      `${ORGANIZATIONS_BASE}/${id}`,
      payload,
    )
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`${ORGANIZATIONS_BASE}/${id}`)
  },
}
