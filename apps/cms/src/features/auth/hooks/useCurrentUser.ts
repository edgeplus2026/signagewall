import { useQuery } from '@tanstack/react-query'

import { authApi } from '@/features/auth/api/authApi'
import { useAuthStore } from '@/features/auth/store/authStore'

export function useCurrentUser() {
  const token = useAuthStore((state) => state.token)
  const refreshToken = useAuthStore((state) => state.refreshToken)
  const setAuth = useAuthStore((state) => state.setAuth)

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const user = await authApi.getUser()
      if (token && refreshToken) {
        setAuth(user, token, refreshToken)
      }
      return user
    },
    enabled: !!token && !!refreshToken,
    retry: false,
  })
}
