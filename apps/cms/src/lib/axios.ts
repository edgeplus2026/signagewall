import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

import { useAuthStore } from '@/features/auth/store/authStore'
import type { AuthTokens } from '@/features/auth/types/auth.types'
import { useOrganizationStore } from '@/features/organizations/store/organizationStore'
import i18n from '@/i18n'
import { toApiError } from '@/lib/api-error'

interface ApiEnvelope<T> {
  success: boolean
  data: T
}

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean
}

const baseURL = import.meta.env.VITE_API_URL || '/api/v1'

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
})

interface RefreshWaiter {
  onToken: (token: string) => void
  onFail: (error: unknown) => void
}

let isRefreshing = false
let refreshQueue: RefreshWaiter[] = []

const processRefreshQueue = (token: string) => {
  refreshQueue.forEach((waiter) => { waiter.onToken(token); })
  refreshQueue = []
}

const failRefreshQueue = (error: unknown) => {
  refreshQueue.forEach((waiter) => { waiter.onFail(error); })
  refreshQueue = []
}

export function resetAuthRefreshState(): void {
  isRefreshing = false
  refreshQueue = []
}

api.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  config.headers['Accept-Language'] = i18n.language

  const organizationId = useOrganizationStore.getState().activeOrganizationId
  if (organizationId) {
    config.headers['X-Organization-Id'] = organizationId
  }

  return config
})

api.interceptors.response.use((response) => {
  const body = response.data as unknown
  if (
    body &&
    typeof body === 'object' &&
    'success' in body &&
    (body as ApiEnvelope<unknown>).success
  ) {
    return { ...response, data: (body as ApiEnvelope<unknown>).data }
  }
  return response
})

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(toApiError(error))
    }

    const axiosError = error as AxiosError
    const originalRequest = axiosError.config as RetryableRequest | undefined
    const status = axiosError.response?.status

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register') &&
      // Redeeming a Google login code is itself an authentication attempt: a
      // 401 here means the code was spent or expired, and refreshing a token
      // the user does not have yet cannot help. Retrying would also burn the
      // single-use code.
      !originalRequest.url?.includes('/auth/google/exchange')
    ) {
      const { refreshToken } = useAuthStore.getState()

      if (!refreshToken) {
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(toApiError(axiosError))
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          // The timeout is only a backstop against a refresh that never
          // settles; a failed refresh rejects the whole queue immediately.
          const timer = setTimeout(() => {
            // Drop the waiter as well as rejecting it. Left in the queue it
            // would still be called by processRefreshQueue/failRefreshQueue
            // later — replaying a request whose caller already gave up, and
            // holding its closure (and originalRequest) alive until then.
            const index = refreshQueue.indexOf(waiter)
            if (index !== -1) {
              refreshQueue.splice(index, 1)
            }
            reject(toApiError(axiosError))
          }, 10_000)
          const waiter: RefreshWaiter = {
            onToken: (token) => {
              clearTimeout(timer)
              originalRequest.headers.Authorization = `Bearer ${token}`
              resolve(api(originalRequest))
            },
            onFail: (refreshError) => {
              clearTimeout(timer)
              reject(toApiError(refreshError))
            },
          }
          refreshQueue.push(waiter)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      // Only the REFRESH call belongs in this try. The replayed request is
      // deliberately outside it: if the retry itself fails (say a 500), that is
      // not a credentials problem and must not log the user out. Returning it
      // from inside the try would have meant either swallowing that distinction
      // or awaiting it and logging out on any downstream error.
      let refreshedToken: string
      try {
        const { data } = await axios.post<ApiEnvelope<AuthTokens>>(
          `${baseURL}/auth/refresh`,
          { refreshToken },
          {
            headers: { 'Content-Type': 'application/json' },
            // Bare `axios`, not the configured instance, so it does not inherit
            // the 10s timeout. Without this a hung refresh keeps `isRefreshing`
            // true forever and every later 401 queues behind it.
            timeout: 10_000,
          },
        )

        const tokens = data.data
        useAuthStore.getState().setTokens(tokens.accessToken, tokens.refreshToken)
        processRefreshQueue(tokens.accessToken)
        refreshedToken = tokens.accessToken
      } catch (refreshError) {
        failRefreshQueue(refreshError)
        useAuthStore.getState().logout()
        window.location.href = '/login'
        throw toApiError(refreshError)
      } finally {
        isRefreshing = false
      }

      originalRequest.headers.Authorization = `Bearer ${refreshedToken}`
      return api(originalRequest)
    }

    return Promise.reject(toApiError(axiosError))
  },
)
