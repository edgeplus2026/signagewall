import type { User } from '@/features/auth/types/auth.types'

export type SupportedLanguage = 'en' | 'sr'

export type ThemePreference = 'light' | 'dark' | 'system'

export interface UpdateProfileRequest {
  name: string
  phone: string
  company?: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  password: string
  confirmPassword: string
}

export interface SetPasswordRequest {
  password: string
  confirmPassword: string
}

export interface AccountSettings {
  language: SupportedLanguage
  theme: ThemePreference
}

export interface UpdateAccountSettingsRequest {
  language?: SupportedLanguage
  theme?: ThemePreference
}

export type ProfileResponse = User

export interface FeedbackRequest {
  rating: number
  message: string
}

export interface ReportProblemRequest {
  message: string
}
