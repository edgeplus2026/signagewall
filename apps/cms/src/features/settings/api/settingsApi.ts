import type {
  AccountSettings,
  ChangePasswordRequest,
  SetPasswordRequest,
  FeedbackRequest,
  ProfileResponse,
  ReportProblemRequest,
  UpdateAccountSettingsRequest,
  UpdateProfileRequest,
} from '@/features/settings/types/settings.types'
import { api } from '@/lib/axios'

const SETTINGS_BASE = '/settings'

export const settingsApi = {
  updateProfile: async (payload: UpdateProfileRequest): Promise<ProfileResponse> => {
    const { data } = await api.patch<ProfileResponse>(`${SETTINGS_BASE}/profile`, payload)
    return data
  },

  changePassword: async (payload: ChangePasswordRequest): Promise<void> => {
    await api.post(`${SETTINGS_BASE}/change-password`, payload)
  },

  setPassword: async (payload: SetPasswordRequest): Promise<void> => {
    await api.post(`${SETTINGS_BASE}/set-password`, payload)
  },

  getSettings: async (): Promise<AccountSettings> => {
    const { data } = await api.get<AccountSettings>(SETTINGS_BASE)
    return data
  },

  updateSettings: async (payload: UpdateAccountSettingsRequest): Promise<AccountSettings> => {
    const { data } = await api.patch<AccountSettings>(SETTINGS_BASE, payload)
    return data
  },

  /** GDPR right of access: returns all personal data we hold about the user. */
  exportData: async (): Promise<unknown> => {
    const { data } = await api.get<unknown>(`${SETTINGS_BASE}/data-export`)
    return data
  },

  /** Starts the 30-day account-deletion grace period. */
  deleteAccount: async (): Promise<{ scheduledFor: string }> => {
    const { data } = await api.delete<{ scheduledFor: string }>(SETTINGS_BASE)
    return data
  },

  submitFeedback: async (payload: FeedbackRequest): Promise<void> => {
    await api.post(`${SETTINGS_BASE}/feedback`, payload)
  },

  reportProblem: async (payload: ReportProblemRequest): Promise<void> => {
    await api.post(`${SETTINGS_BASE}/report-problem`, payload)
  },
}
