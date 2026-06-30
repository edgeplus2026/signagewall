export type AlertRecipientRole = 'admin' | 'member'

export interface OrgAlertSettings {
  enabled: boolean
  offlineThresholdMin: number
  recipientRoles: AlertRecipientRole[]
  respectAvailability: boolean
}

export type UpdateOrgAlertSettingsRequest = Partial<OrgAlertSettings>
