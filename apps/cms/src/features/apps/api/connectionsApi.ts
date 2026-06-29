import type {
  Connection,
  ConnectionProvider,
} from '@/features/apps/types/connection.types'
import { api } from '@/lib/axios'

const BASE = '/connections'

export const connectionsApi = {
  list: async (): Promise<Connection[]> => {
    const { data } = await api.get<Connection[]>(BASE)
    return data
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`${BASE}/${id}`)
  },

  /**
   * Ask the backend (authenticated, so it knows the org + user) for the provider
   * authorization URL. The caller then navigates the browser to it; the provider
   * returns to the CMS connection callback page.
   */
  start: async (
    provider: ConnectionProvider,
    appSlug: string,
  ): Promise<string> => {
    const { data } = await api.get<{ url: string }>(
      `${BASE}/oauth/${provider}/start`,
      { params: { appSlug } },
    )
    return data.url
  },
}
