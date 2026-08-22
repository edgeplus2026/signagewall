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
  useReportSchedule,
  useSaveReportSchedule,
} from '@/features/reports/hooks/usePlaybackReports'
import type {
  ReportFrequency,
  ReportSchedule,
} from '@/features/reports/types/reports.types'

const FREQUENCIES: ReportFrequency[] = ['daily', 'weekly', 'monthly']

/**
 * A standing instruction to email the report.
 *
 * Worth having because an empty report is invisible: a screen that stopped
 * reporting three weeks ago looks exactly like a screen nobody asked about, and
 * the moment somebody asks is usually the moment a client already noticed. A
 * scheduled send puts the coverage number in front of a person either way.
 */
export function ReportScheduleCard() {
  const { t } = useTranslation()
  const { data, isLoading } = useReportSchedule()

  if (isLoading || !data) {
    return (
      <div className="border-secondary bg-panel text-secondary rounded-lg border p-4 text-sm sm:p-5">
        {t('reports.schedule.heading')}
      </div>
    )
  }

  // Mounted with the server's answer as its initial state rather than syncing in
  // an effect: the form is an editable copy, and a copy that keeps re-seeding
  // itself would overwrite whatever the operator was in the middle of typing.
  return <ScheduleForm key={data.lastSentAt ?? 'schedule'} schedule={data} />
}

function ScheduleForm({ schedule }: { schedule: ReportSchedule }) {
  const { t } = useTranslation()
  const save = useSaveReportSchedule()
  const data = schedule

  const [enabled, setEnabled] = useState(schedule.enabled)
  const [frequency, setFrequency] = useState<ReportFrequency>(schedule.frequency)
  const [recipients, setRecipients] = useState(schedule.recipients.join(', '))

  const submit = (): void => {
    const addresses = recipients
      .split(/[,\s]+/)
      .map((value) => value.trim())
      .filter(Boolean)

    if (enabled && addresses.length === 0) {
      toast.error(t('reports.schedule.needsRecipient'))
      return
    }

    save.mutate(
      {
        enabled,
        frequency,
        recipients: addresses,
        timezone: data.timezone,
      },
      {
        onSuccess: () => {
          toast.success(t('reports.schedule.saved'))
        },
        onError: () => {
          toast.error(t('reports.schedule.failed'))
        },
      },
    )
  }

  return (
    <div className="border-secondary bg-panel flex flex-col gap-4 rounded-lg border p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-primary text-sm font-medium">
            {t('reports.schedule.heading')}
          </span>
          <span className="text-secondary text-xs">
            {t('reports.schedule.description')}
          </span>
          {/* The send time is fixed, so it is stated rather than asked for. */}
          <span className="text-secondary text-xs">
            {t('reports.schedule.sendTime')}
          </span>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-secondary text-xs">
            {t('reports.schedule.recipients')}
          </span>
          <Input
            value={recipients}
            placeholder="john@example.com, jane@example.com"
            onChange={(event) => {
              setRecipients(event.target.value)
            }}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-secondary text-xs">
            {t('reports.schedule.frequency')}
          </span>
          <Select
            value={frequency}
            onValueChange={(value) => {
              setFrequency(value as ReportFrequency)
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCIES.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`reports.schedule.frequencies.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <Button onClick={submit} disabled={save.isPending}>
          {t('common.save')}
        </Button>
      </div>

      {data.lastError ? (
        // Surfaced here rather than only in a server log: the person who set
        // this up is the only one who will notice it stopped arriving.
        <p className="text-danger text-xs">
          {t('reports.schedule.lastError', { error: data.lastError })}
        </p>
      ) : data.lastSentAt ? (
        <p className="text-secondary text-xs">
          {t('reports.schedule.lastSent', {
            date: new Date(data.lastSentAt).toLocaleString(),
          })}
        </p>
      ) : null}
    </div>
  )
}
