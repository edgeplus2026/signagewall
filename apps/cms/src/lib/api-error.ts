import axios from 'axios'

export class ApiError extends Error {
  readonly code: string | undefined
  /** The API's `error.details` payload, when it sent one. */
  readonly details: unknown

  constructor(message: string, code?: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.details = details
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
      | { error?: { message?: string; code?: string; details?: unknown } }
      | undefined
    // `error.message` is always a string on an AxiosError, so `??` never fired
    // on it — an empty one still needs the fallback, hence the explicit check.
    const axiosMessage = error.message === '' ? 'Request failed' : error.message
    const message = payload?.error?.message ?? axiosMessage
    return new ApiError(message, payload?.error?.code, payload?.error?.details)
  }
  if (error instanceof ApiError) {
    return error
  }
  if (error instanceof Error) {
    return new ApiError(error.message)
  }
  return new ApiError('Request failed')
}
