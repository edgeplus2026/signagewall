export type AuthProvider = 'local' | 'google'

export interface User {
  id: string
  email: string
  name: string
  phone?: string
  company?: string
  provider: AuthProvider
  hasPassword: boolean
  isSuperAdmin: boolean
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  phone: string
  company?: string
  password: string
  acceptedLegal: boolean
  inviteToken?: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  password: string
  confirmPassword: string
}

export interface AuthResponse {
  user: User
  tokens: AuthTokens
}

export interface PendingVerification {
  needsVerification: true
  email: string
}

export type RegisterResponse = AuthResponse | PendingVerification

export function isPendingVerification(
  response: RegisterResponse,
): response is PendingVerification {
  return 'needsVerification' in response
}

export interface VerifyEmailRequest {
  token: string
}

export interface ResendVerificationRequest {
  email: string
}
