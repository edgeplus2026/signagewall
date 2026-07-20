import { MonitorIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Cell, Pie, PieChart } from 'recharts'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

interface ScreenStatusChartProps {
  online: number
  offline: number
  total: number
}

const ONLINE_COLOR = 'var(--success)'
const OFFLINE_COLOR = 'var(--border-primary)'

export function ScreenStatusChart({ online, offline, total }: ScreenStatusChartProps) {
  const { t } = useTranslation()

  const config = {
    online: { label: t('dashboard.screens.status.online'), color: ONLINE_COLOR },
    offline: { label: t('dashboard.screens.status.offline'), color: OFFLINE_COLOR },
  } satisfies ChartConfig

  if (total === 0) {
    return (
      <div className="text-secondary flex h-55 flex-col items-center justify-center gap-1 text-center text-sm">
        <MonitorIcon className="mb-1 size-6 opacity-40" />
        {t('dashboard.screens.empty')}
      </div>
    )
  }

  const data = [
    { key: 'online', value: online, fill: ONLINE_COLOR },
    { key: 'offline', value: offline, fill: OFFLINE_COLOR },
  ]
  const bothPresent = online > 0 && offline > 0

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <div className="relative">
        <ChartContainer config={config} className="aspect-square h-45">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="key"
              innerRadius={58}
              outerRadius={80}
              paddingAngle={bothPresent ? 3 : 0}
              cornerRadius={4}
              strokeWidth={0}
            >
              {data.map((entry) => (
                // eslint-disable-next-line @typescript-eslint/no-deprecated -- Cell is the supported per-slice colour API through Recharts 3; shape/content migration lands in 4.
                <Cell key={entry.key} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-primary text-3xl leading-none font-semibold tabular-nums">
            {online}
          </span>
          <span className="text-secondary mt-1.5 text-xs">
            {t('dashboard.screens.ofTotal', { total })}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-5 text-xs">
        <span className="text-secondary inline-flex items-center gap-1.5">
          <span className="bg-success size-2 rounded-full" />
          {t('dashboard.screens.status.online')}
          <span className="text-primary font-medium tabular-nums">{online}</span>
        </span>
        <span className="text-secondary inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ backgroundColor: OFFLINE_COLOR }} />
          {t('dashboard.screens.status.offline')}
          <span className="text-primary font-medium tabular-nums">{offline}</span>
        </span>
      </div>
    </div>
  )
}
