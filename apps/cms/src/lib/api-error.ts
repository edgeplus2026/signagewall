import axios from 'axios'

export class ApiError extends Error {
  readonly code: string | undefined

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as
      | { error?: { message?: string; code?: string } }
      | undefined
    const message = payload?.error?.message ?? error.message ?? 'Request failed'
    return new ApiError(message, payload?.error?.code)
  }
  if (error instanceof ApiError) {
    return error
  }
  if (error instanceof Error) {
    return new ApiError(error.message)
  }
  return new ApiError('Request failed')
}
