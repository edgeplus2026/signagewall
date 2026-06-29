import type { AppCategory } from '@/features/apps/types/app.types'
import { api } from '@/lib/axios'

const ADMIN_BASE = '/admin/app-categories'
const ORG_BASE = '/apps/categories'

export interface CreateCategoryPayload {
  name: string
  order?: number | undefined
}

export type UpdateCategoryPayload = Partial<CreateCategoryPayload>

export const categoriesApi = {
  /** Org-facing read, for the catalog filter. */
  list: async (): Promise<AppCategory[]> => {
    const { data } = await api.get<AppCategory[]>(ORG_BASE)
    return data
  },

  // ----- Super-admin management -----

  listAll: async (): Promise<AppCategory[]> => {
    const { data } = await api.get<AppCategory[]>(ADMIN_BASE)
    return data
  },

  create: async (payload: CreateCategoryPayload): Promise<AppCategory> => {
    const { data } = await api.post<AppCategory>(ADMIN_BASE, payload)
    return data
  },

  update: async (
    id: string,
    payload: UpdateCategoryPayload,
  ): Promise<AppCategory> => {
    const { data } = await api.patch<AppCategory>(`${ADMIN_BASE}/${id}`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`${ADMIN_BASE}/${id}`)
  },
}
