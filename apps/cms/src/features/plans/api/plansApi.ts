import type {
  CreateUpgradeRequestPayload,
  PlanEntitlement,
} from '@/features/plans/types/plan.types'
import { api } from '@/lib/axios'

const PLANS_BASE = '/plans'

export const plansApi = {
  getMyPlan: async (): Promise<PlanEntitlement> => {
    const { data } = await api.get<PlanEntitlement>(`${PLANS_BASE}/me`)
    return data
  },

  requestUpgrade: async (payload: CreateUpgradeRequestPayload): Promise<void> => {
    await api.post(`${PLANS_BASE}/upgrade-request`, payload)
  },
}
