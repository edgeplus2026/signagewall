import { ActivityIcon, ArrowRightIcon, MousePointerClickIcon, UsersIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useFunnelOverview } from '@/features/analytics/hooks/useFunnelOverview'
import type { FunnelEventName } from '@/features/analytics/types/analytics.types'
import { cn } from '@/lib/utils'

const stageStyles: Record<string, string> = {
  marketing_landing: 'border-info/25 bg-info/10 text-info',
  marketing_cta_clicked: 'border-info/25 bg-info/10 text-info',
  generate_lead: 'border-warning/25 bg-warning/10 text-warning',
  sign_up: 'border-brand/25 bg-brand/10 text-brand',
  trial_started: 'border-brand/25 bg-brand/10 text-brand',
  organization_created: 'border-brand/25 bg-brand/10 text-brand',
  screen_created: 'border-success/25 bg-success/10 text-success',
  content_published: 'border-success/25 bg-success/10 text-success',
  device_paired: 'border-success/25 bg-success/10 text-success',
  first_screen_activated: 'border-success/25 bg-success/10 text-success',
  subscription_requested: 'border-warning/25 bg-warning/10 text-warning',
  invoice_issued: 'border-info/25 bg-info/10 text-info',
  purchase: 'border-success/25 bg-success/10 text-success',
}

export function AnalyticsTab() {
  const { t, i18n } = useTranslation()
  const [days, setDays] = useState(30)
  const { data, isLoading, isError } = useFunnelOverview(days)
  const label = (event: FunnelEventName) =>
    t(`superAdmin.analytics.events.${event}`, { defaultValue: event.replaceAll('_', ' ') })
  const number = new Intl.NumberFormat(i18n.language)

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />
  }
  if (isError || !data) {
    return <p className="text-danger text-sm">{t('superAdmin.analytics.error')}</p>
  }

  const count = (event: FunnelEventName) =>
    data.stages.find((stage) => stage.eventName === event)?.count ?? 0
  const landingCount = count('marketing_landing')
  const signupCount = count('sign_up')
  const activationCount = count('first_screen_activated')
  const purchaseCount = count('purchase')
  const conversion = (value: number) =>
    landingCount > 0 ? `${((value / landingCount) * 100).toFixed(1)}%` : '—'
  const summaryCards = [
    {
      Icon: MousePointerClickIcon,
      event: 'marketing_landing' as const,
      value: landingCount,
      rate: '100%',
    },
    {
      Icon: UsersIcon,
      event: 'sign_up' as const,
      value: signupCount,
      rate: conversion(signupCount),
    },
    {
      Icon: ActivityIcon,
      event: 'first_screen_activated' as const,
      value: activationCount,
      rate: conversion(activationCount),
    },
    {
      Icon: ArrowRightIcon,
      event: 'purchase' as const,
      value: purchaseCount,
      rate: conversion(purchaseCount),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">{t('superAdmin.analytics.title')}</h2>
          <p className="text-secondary text-sm">{t('superAdmin.analytics.description')}</p>
        </div>
        <Select
          value={String(days)}
          onValueChange={(value) => {
            setDays(Number(value))
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[7, 30, 90].map((value) => (
              <SelectItem key={value} value={String(value)}>
                {t('superAdmin.analytics.lastDays', { count: value })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ Icon, event, value, rate }) => (
          <Card key={event} className={stageStyles[event]}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm">{label(event)}</CardTitle>
              <Icon className="size-4" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{number.format(value)}</p>
              <p className="mt-1 text-xs opacity-80">
                {rate} {t('superAdmin.analytics.fromLanding')}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('superAdmin.analytics.funnel')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 lg:grid-cols-2">
          {data.stages.map((stage) => (
            <div
              key={stage.eventName}
              className="border-secondary flex items-center gap-3 rounded-lg border p-3"
            >
              <Badge
                variant="outline"
                className={cn(stageStyles[stage.eventName], 'min-w-40 justify-start')}
              >
                {label(stage.eventName)}
              </Badge>
              <span className="ml-auto font-medium">{number.format(stage.count)}</span>
              <span className="text-secondary w-14 text-right text-xs">
                {stage.conversionFromPrevious === null
                  ? '—'
                  : `${stage.conversionFromPrevious.toString()}%`}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('superAdmin.analytics.acquisition')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.acquisitions.length === 0 ? (
              <p className="text-secondary text-sm">{t('superAdmin.analytics.empty')}</p>
            ) : (
              data.acquisitions.map((item, index) => (
                <div
                  key={`${item.eventName}-${item.source}-${item.campaign}-${index.toString()}`}
                  className="border-secondary flex items-center gap-3 border-b py-2 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {item.source} / {item.medium}
                    </p>
                    <p className="text-secondary truncate text-xs">{item.campaign}</p>
                  </div>
                  <Badge variant="outline" className={stageStyles[item.eventName]}>
                    {label(item.eventName)}
                  </Badge>
                  <span className="ml-auto font-medium">{number.format(item.count)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('superAdmin.analytics.recent')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recent.length === 0 ? (
              <p className="text-secondary text-sm">{t('superAdmin.analytics.empty')}</p>
            ) : (
              data.recent.slice(0, 15).map((event) => (
                <div
                  key={event._id}
                  className="border-secondary flex items-center gap-3 border-b py-2 last:border-0"
                >
                  <Badge variant="outline" className={stageStyles[event.eventName]}>
                    {label(event.eventName)}
                  </Badge>
                  <span className="text-secondary truncate text-xs">
                    {event.firstTouch?.source ??
                      (event.source === 'server' ? 'application' : 'direct')}
                  </span>
                  <time className="text-secondary ml-auto shrink-0 text-xs">
                    {new Date(event.occurredAt).toLocaleString(i18n.language)}
                  </time>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
