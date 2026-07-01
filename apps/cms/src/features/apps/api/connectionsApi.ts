import type {
  CanvaDesign,
  Connection,
  ConnectionProvider,
} from '@/features/apps/types/connection.types'
import { api } from '@/lib/axios'

const BASE = '/connections'

export const connectionsApi = {
  /** Token-free summary of a single connection (the instance's connected state). */
  getOne: async (id: string): Promise<Connection> => {
    const { data } = await api.get<Connection>(`${BASE}/${id}`)
    return data
  },

  /**
   * Ask the backend (authenticated, so it knows the org + user) for the provider
   * authorization URL for connecting THIS instance's account. The caller then
   * navigates the browser to it; the backend binds the connection to the
   * instance on callback and redirects back to the instance config page.
   */
  start: async (
    provider: ConnectionProvider,
    appSlug: string,
    instanceId: string,
  ): Promise<string> => {
    const { data } = await api.get<{ url: string }>(
      `${BASE}/oauth/${provider}/start`,
      { params: { appSlug, instanceId } },
    )
    return data.url
  },

  /**
   * Search the Canva designs reachable through a connection (for the config-form
   * picker). The backend refreshes the access token as needed, so this never
   * fails on an expired token.
   */
  listCanvaDesigns: async (
    connectionId: string,
    query: string,
  ): Promise<CanvaDesign[]> => {
    const { data } = await api.get<CanvaDesign[]>(
      `${BASE}/${connectionId}/canva/designs`,
      { params: query ? { query } : {} },
    )
    return data
  },
}
