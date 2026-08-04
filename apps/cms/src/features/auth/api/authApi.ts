import type {
  AuthResponse,
  AuthTokens,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  ResetPasswordRequest,
  User,
  VerifyEmailRequest,
} from '@/features/auth/types/auth.types'
import { api } from '@/lib/axios'

const AUTH_BASE = '/auth'

export const authApi = {
  getUser: async (): Promise<User> => {
    const { data } = await api.get<User>(`${AUTH_BASE}/me`)
    return data
  },

  login: async (payload: LoginRequest): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>(`${AUTH_BASE}/login`, payload)
    return data
  },

  register: async (payload: RegisterRequest): Promise<RegisterResponse> => {
    const { data } = await api.post<RegisterResponse>(`${AUTH_BASE}/register`, payload)
    return data
  },

  verifyEmail: async (payload: VerifyEmailRequest): Promise<void> => {
    await api.post(`${AUTH_BASE}/verify-email`, payload)
  },

  resendVerification: async (payload: ResendVerificationRequest): Promise<void> => {
    await api.post(`${AUTH_BASE}/resend-verification`, payload)
  },

  forgotPassword: async (payload: ForgotPasswordRequest): Promise<void> => {
    await api.post(`${AUTH_BASE}/forgot-password`, payload)
  },

  resetPassword: async (payload: ResetPasswordRequest): Promise<void> => {
    await api.post(`${AUTH_BASE}/reset-password`, payload)
  },

  refresh: async (refreshToken: string): Promise<AuthTokens> => {
    const { data } = await api.post<AuthTokens>(`${AUTH_BASE}/refresh`, {
      refreshToken,
    })
    return data
  },

  logout: async (): Promise<void> => {
    await api.post(`${AUTH_BASE}/logout`)
  },

  exitImpersonation: async (): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>(`${AUTH_BASE}/exit-impersonation`)
    return data
  },

  loginWithGoogle: (acquisitionToken?: string): void => {
    const baseUrl = import.meta.env.VITE_API_URL || '/api/v1'
    const target = new URL(`${baseUrl}${AUTH_BASE}/google`, window.location.origin)
    if (acquisitionToken) target.searchParams.set('acquisition', acquisitionToken)
    window.location.href = target.toString()
  },
}
