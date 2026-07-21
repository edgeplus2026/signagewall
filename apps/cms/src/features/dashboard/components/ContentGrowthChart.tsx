import { TrendingUpIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { GrowthPoint } from '@/features/dashboard/hooks/useDashboardData'

interface ContentGrowthChartProps {
  data: GrowthPoint[]
}

export function ContentGrowthChart({ data }: ContentGrowthChartProps) {
  const { t, i18n } = useTranslation()

  const shortDate = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }),
    [i18n.language],
  )

  const config = {
    total: {
      label: t('dashboard.charts.growth.series'),
      color: 'var(--brand)',
    },
  } satisfies ChartConfig

  const latest = data.at(-1)?.total ?? 0
  // Baseline is the cumulative total at the start of the window, so "added" counts
  // everything created within it. (Using the first *non-zero* point instead would
  // report 0 whenever all content is recent — the first non-zero bucket already
  // holds the full total.)
  const first = data[0]?.total ?? 0
  const added = Math.max(0, latest - first)

  if (latest === 0) {
    return (
      <div className="text-secondary flex h-60 flex-col items-center justify-center gap-1 text-center text-sm">
        <TrendingUpIcon className="mb-1 size-6 opacity-40" />
        {t('dashboard.charts.growth.empty')}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-secondary text-xs">
        <span className="text-success font-medium">
          +{added} {t('dashboard.charts.growth.addedSuffix')}
        </span>{' '}
        {t('dashboard.charts.growth.window')}
      </p>
      <ChartContainer config={config} className="h-55 w-full">
        <AreaChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="dashboard-growth-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.28} />
              <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="weekStart"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={28}
            interval="preserveStartEnd"
            tickFormatter={(value: number) => shortDate.format(value)}
          />
          <YAxis hide domain={[0, 'dataMax + 2']} />
          <ChartTooltip
            cursor={{ strokeDasharray: '4 4' }}
            content={
              <ChartTooltipContent
                indicator="dot"
                labelFormatter={(_label, payload) => {
                  const point = payload[0]?.payload as GrowthPoint | undefined
                  return point ? shortDate.format(point.weekStart) : ''
                }}
              />
            }
          />
          <Area
            dataKey="total"
            type="monotone"
            stroke="var(--color-total)"
            strokeWidth={2}
            fill="url(#dashboard-growth-fill)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}
