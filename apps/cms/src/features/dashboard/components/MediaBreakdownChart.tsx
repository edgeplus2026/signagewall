import { ImageIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Cell, Pie, PieChart } from 'recharts'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatFileSize } from '@/features/media/lib/mediaUtils'

interface MediaBreakdownChartProps {
  images: number
  videos: number
  storageBytes: number
}

const IMAGE_COLOR = 'var(--brand)'
const VIDEO_COLOR = 'color-mix(in srgb, var(--brand) 32%, transparent)'

export function MediaBreakdownChart({ images, videos, storageBytes }: MediaBreakdownChartProps) {
  const { t } = useTranslation()
  const total = images + videos

  const config = {
    images: { label: t('dashboard.media.images'), color: IMAGE_COLOR },
    videos: { label: t('dashboard.media.videos'), color: VIDEO_COLOR },
  } satisfies ChartConfig

  if (total === 0) {
    return (
      <div className="text-secondary flex h-55 flex-col items-center justify-center gap-1 text-center text-sm">
        <ImageIcon className="mb-1 size-6 opacity-40" />
        {t('dashboard.media.empty')}
      </div>
    )
  }

  const data = [
    { key: 'images', value: images, fill: IMAGE_COLOR },
    { key: 'videos', value: videos, fill: VIDEO_COLOR },
  ]
  const bothPresent = images > 0 && videos > 0

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
            {total}
          </span>
          <span className="text-secondary mt-1.5 text-xs">{t('dashboard.media.files')}</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center justify-center gap-5 text-xs">
          <span className="text-secondary inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: IMAGE_COLOR }} />
            {t('dashboard.media.images')}
            <span className="text-primary font-medium tabular-nums">{images}</span>
          </span>
          <span className="text-secondary inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: VIDEO_COLOR }} />
            {t('dashboard.media.videos')}
            <span className="text-primary font-medium tabular-nums">{videos}</span>
          </span>
        </div>
        {storageBytes > 0 ? (
          <p className="text-secondary text-xs">
            {formatFileSize(storageBytes)} {t('dashboard.media.stored')}
          </p>
        ) : null}
      </div>
    </div>
  )
}
