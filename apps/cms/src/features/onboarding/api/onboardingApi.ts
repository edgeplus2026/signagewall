import type {
  OnboardingState,
  UpdateOnboardingRequest,
} from '@/features/onboarding/types/onboarding.types'
import { api } from '@/lib/axios'

const ONBOARDING_BASE = '/onboarding'

export const onboardingApi = {
  get: async (): Promise<OnboardingState> => {
    const { data } = await api.get<OnboardingState>(ONBOARDING_BASE)
    return data
  },

  update: async (payload: UpdateOnboardingRequest): Promise<OnboardingState> => {
    const { data } = await api.patch<OnboardingState>(ONBOARDING_BASE, payload)
    return data
  },
}
