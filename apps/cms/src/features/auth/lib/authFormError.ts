import { ApiError, getApiErrorMessage, toApiError } from '@/lib/api-error'

export function resolveAuthFormError(
  error: unknown,
  fallbackKey: string,
  t: (key: string) => string,
): string {
  return getApiErrorMessage(error, t(fallbackKey))
}

export function resolveRegisterErrorField(error: unknown): 'email' | 'password' {
  const apiError = error instanceof ApiError ? error : toApiError(error)
  return apiError.code === 'CONFLICT' ? 'email' : 'password'
}
