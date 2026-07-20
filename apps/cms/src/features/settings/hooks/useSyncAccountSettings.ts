import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuthStore } from '@/features/auth/store/authStore'
import { settingsApi } from '@/features/settings/api/settingsApi'
import { useTheme } from '@/providers/ThemeProvider'

/**
 * Hydrates the user's saved theme and language from the account-settings
 * endpoint once per authenticated session, so preferences follow the account
 * across devices and browsers. The local (localStorage) values are used for the
 * first paint; the server value wins once it arrives.
 */
export function useSyncAccountSettings() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const { theme, setTheme } = useTheme()
  const { i18n } = useTranslation()
  const appliedRef = useRef(false)

  const { data } = useQuery({
    queryKey: ['settings', 'account'],
    queryFn: settingsApi.getSettings,
    enabled: isAuthenticated,
    staleTime: Infinity,
    retry: false,
  })

  useEffect(() => {
    if (!data || appliedRef.current) return
    appliedRef.current = true

    if (data.theme !== theme) {
      setTheme(data.theme)
    }
    if (data.language !== i18n.language.split('-')[0]) {
      void i18n.changeLanguage(data.language)
    }
  }, [data, theme, setTheme, i18n])
}
