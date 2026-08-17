import type {
  Connection,
  ConnectionProvider,
  RemoteOption,
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
    const { data } = await api.get<{ url: string }>(`${BASE}/oauth/${provider}/start`, {
      params: { appSlug, instanceId },
    })
    return data.url
  },

  /**
   * Search a connection's resources for a `remote-select` field, by its
   * `remoteSource` (e.g. 'canva-designs', 'google-calendars'). The backend
   * refreshes the access token as needed, so this never fails on an expired
   * token.
   */
  browseRemoteOptions: async (
    connectionId: string,
    source: string,
    query: string,
    context: Record<string, string> = {},
  ): Promise<RemoteOption[]> => {
    const { data } = await api.get<RemoteOption[]>(`${BASE}/${connectionId}/browse/${source}`, {
      params: { ...(query ? { query } : {}), ...context },
    })
    return data
  },

  /**
   * The header row of a synced spreadsheet, for the `column-mapping` control.
   * `kind` picks the provider reader ('gsheets' | 'excel'); `worksheet` may be
   * blank for the first sheet.
   */
  fetchTabularHeaders: async (
    connectionId: string,
    kind: string,
    fileId: string,
    worksheet: string,
  ): Promise<string[]> => {
    const { data } = await api.get<{ headers: string[] }>(
      `${BASE}/${connectionId}/tabular/headers`,
      { params: { kind, fileId, ...(worksheet ? { worksheet } : {}) } },
    )
    return data.headers
  },
}
