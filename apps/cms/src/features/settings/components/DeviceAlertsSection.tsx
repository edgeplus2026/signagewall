import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  SettingsRow,
  SettingsSection,
} from '@/features/settings/components/SettingsSection'
import {
  useOrgAlertSettings,
  useUpdateOrgAlertSettings,
} from '@/features/settings/hooks/useOrgAlertSettings'
import type {
  AlertRecipientRole,
  OrgAlertSettings,
} from '@/features/settings/types/orgAlertSettings.types'
import { getApiErrorMessage } from '@/lib/api-error'

const THRESHOLD_MIN = 1
const THRESHOLD_MAX = 1440

type RecipientsChoice = 'admins' | 'all'

const rolesToChoice = (roles: AlertRecipientRole[]): RecipientsChoice =>
  roles.includes('member') ? 'all' : 'admins'

const choiceToRoles = (choice: RecipientsChoice): AlertRecipientRole[] =>
  choice === 'all' ? ['admin', 'member'] : ['admin']

/**
 * Org-level device-offline alert configuration. Rendered only for org admins;
 * the backend defaults make alerting work even when this is never touched.
 */
export function DeviceAlertsSection() {
  const { data } = useOrgAlertSettings()

  // Renders nothing for non-admins (the query is gated) or before first load.
  if (!data) {
    return null
  }

  return (
    <DeviceAlertsForm
      key={`${String(data.enabled)}-${String(data.offlineThresholdMin)}-${rolesToChoice(data.recipientRoles)}-${String(data.respectAvailability)}`}
      settings={data}
    />
  )
}

function DeviceAlertsForm({ settings }: { settings: OrgAlertSettings }) {
  const { t } = useTranslation()
  const update = useUpdateOrgAlertSettings()

  const [enabled, setEnabled] = useState(settings.enabled)
  const [threshold, setThreshold] = useState(String(settings.offlineThresholdMin))
  const [recipients, setRecipients] = useState<RecipientsChoice>(
    rolesToChoice(settings.recipientRoles),
  )
  const [respectAvailability, setRespectAvailability] = useState(
    settings.respectAvailability,
  )

  const parsedThreshold = Number(threshold)
  const thresholdValid =
    Number.isInteger(parsedThreshold) &&
    parsedThreshold >= THRESHOLD_MIN &&
    parsedThreshold <= THRESHOLD_MAX

  const dirty =
    enabled !== settings.enabled ||
    parsedThreshold !== settings.offlineThresholdMin ||
    recipients !== rolesToChoice(settings.recipientRoles) ||
    respectAvailability !== settings.respectAvailability

  // When alerting is disabled the threshold is irrelevant, so it must not block
  // saving — otherwise a user who blanked the field and then toggled alerting
  // off (which disables the field) would be stuck unable to persist the change.
  const canSave = enabled ? thresholdValid : true

  const onSave = async () => {
    if (!canSave) {
      return
    }
    try {
      await update.mutateAsync({
        enabled,
        recipientRoles: choiceToRoles(recipients),
        respectAvailability,
        // Omit a blank/invalid threshold rather than sending 0 (the API rejects
        // < 1); the partial update leaves the stored value untouched.
        ...(thresholdValid ? { offlineThresholdMin: parsedThreshold } : {}),
      })
      toast.success(t('deviceAlerts.settings.success'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('deviceAlerts.settings.error')))
    }
  }

  return (
    <SettingsSection title={t('deviceAlerts.settings.title')}>
      <SettingsRow
        label={t('deviceAlerts.settings.enabled.label')}
        description={t('deviceAlerts.settings.enabled.description')}
      >
        <Switch
          checked={enabled}
          aria-label={t('deviceAlerts.settings.enabled.label')}
          onCheckedChange={setEnabled}
        />
      </SettingsRow>

      <SettingsRow
        label={t('deviceAlerts.settings.threshold.label')}
        description={t('deviceAlerts.settings.threshold.description')}
      >
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={THRESHOLD_MIN}
            max={THRESHOLD_MAX}
            value={threshold}
            disabled={!enabled}
            aria-invalid={!thresholdValid}
            aria-label={t('deviceAlerts.settings.threshold.label')}
            className="w-24"
            onChange={(event) => {
              setThreshold(event.target.value)
            }}
          />
          <span className="text-secondary text-sm">
            {t('deviceAlerts.settings.threshold.unit')}
          </span>
        </div>
      </SettingsRow>

      <SettingsRow
        label={t('deviceAlerts.settings.recipients.label')}
        description={t('deviceAlerts.settings.recipients.description')}
      >
        <Select
          value={recipients}
          disabled={!enabled}
          onValueChange={(next) => {
            setRecipients(next as RecipientsChoice)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admins">
              {t('deviceAlerts.settings.recipients.adminsOnly')}
            </SelectItem>
            <SelectItem value="all">
              {t('deviceAlerts.settings.recipients.everyone')}
            </SelectItem>
          </SelectContent>
        </Select>
      </SettingsRow>

      <SettingsRow
        label={t('deviceAlerts.settings.respectAvailability.label')}
        description={t('deviceAlerts.settings.respectAvailability.description')}
      >
        <Switch
          checked={respectAvailability}
          disabled={!enabled}
          aria-label={t('deviceAlerts.settings.respectAvailability.label')}
          onCheckedChange={setRespectAvailability}
        />
      </SettingsRow>

      <div className="flex justify-end px-4 py-3">
        <Button
          size="sm"
          onClick={() => void onSave()}
          disabled={!dirty || !canSave || update.isPending}
        >
          {t('deviceAlerts.settings.save')}
        </Button>
      </div>
    </SettingsSection>
  )
}
