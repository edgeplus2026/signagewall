import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import {
  clearImpersonationBackup,
  hasImpersonationBackup,
} from '../lib/impersonation'
import type { User } from '../types/auth.types'

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  impersonationActive: boolean
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  setImpersonationActive: (active: boolean) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        impersonationActive: hasImpersonationBackup(),

        setAuth: (user, accessToken, refreshToken) =>
          set(
            {
              user,
              token: accessToken,
              refreshToken,
              isAuthenticated: true,
            },
            false,
            'auth/setAuth',
          ),

        setImpersonationActive: (active) =>
          set({ impersonationActive: active }, false, 'auth/setImpersonationActive'),

        setTokens: (accessToken, refreshToken) =>
          set(
            { token: accessToken, refreshToken, isAuthenticated: true },
            false,
            'auth/setTokens',
          ),

        logout: () => {
          clearImpersonationBackup()
          set(
            {
              user: null,
              token: null,
              refreshToken: null,
              isAuthenticated: false,
              impersonationActive: false,
            },
            false,
            'auth/logout',
          )
        },

        updateUser: (partial) =>
          set(
            (state) => ({
              user: state.user ? { ...state.user, ...partial } : null,
            }),
            false,
            'auth/updateUser',
          ),
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          token: state.token,
          refreshToken: state.refreshToken,
          user: state.user,
        }),
        onRehydrateStorage: () => (state) => {
          if (state?.token) {
            state.isAuthenticated = true
          }
        },
      },
    ),
  ),
)
