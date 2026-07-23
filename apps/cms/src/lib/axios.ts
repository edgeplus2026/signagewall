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

let isRefreshing = false
let refreshQueue: ((token: string) => void)[] = []

const processRefreshQueue = (token: string) => {
  refreshQueue.forEach((callback) => { callback(token); })
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
      !originalRequest.url?.includes('/auth/register')
    ) {
      const { refreshToken } = useAuthStore.getState()

      if (!refreshToken) {
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(toApiError(axiosError))
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(api(originalRequest))
          })
          setTimeout(() => { reject(toApiError(axiosError)); }, 10_000)
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
          { headers: { 'Content-Type': 'application/json' } },
        )

        const tokens = data.data
        useAuthStore.getState().setTokens(tokens.accessToken, tokens.refreshToken)
        processRefreshQueue(tokens.accessToken)
        refreshedToken = tokens.accessToken
      } catch (refreshError) {
        refreshQueue = []
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
