import type {
  OrgAlertSettings,
  UpdateOrgAlertSettingsRequest,
} from '@/features/settings/types/orgAlertSettings.types'
import { api } from '@/lib/axios'

const base = (organizationId: string) =>
  `/organizations/${organizationId}/alert-settings`

/** Admin-only per-organization device-offline alerting configuration. */
export const orgAlertSettingsApi = {
  get: async (organizationId: string): Promise<OrgAlertSettings> => {
    const { data } = await api.get<OrgAlertSettings>(base(organizationId))
    return data
  },

  update: async (
    organizationId: string,
    payload: UpdateOrgAlertSettingsRequest,
  ): Promise<OrgAlertSettings> => {
    const { data } = await api.patch<OrgAlertSettings>(
      base(organizationId),
      payload,
    )
    return data
  },
}
