import { cn } from '@/lib/utils'

interface SparklineProps {
  data: number[]
  className?: string
  strokeWidth?: number
}

/**
 * Minimal dependency-free sparkline. Draws a filled area under a line across a
 * normalized 100×32 viewbox and stretches to fill its container, so it stays
 * crisp at any width via a non-scaling stroke. Colour follows `currentColor`.
 */
export function Sparkline({ data, className, strokeWidth = 1.5 }: SparklineProps) {
  if (data.length < 2) {
    return null
  }

  const width = 100
  const height = 32
  const pad = 3
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const stepX = width / (data.length - 1)

  const points = data.map((value, index) => {
    const x = index * stepX
    const y = pad + (height - pad * 2) * (1 - (value - min) / span)
    return [x, y] as const
  })

  const line = points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ')
  const area = `${line} L${String(width)},${String(height)} L0,${String(height)} Z`

  return (
    <svg
      viewBox={`0 0 ${String(width)} ${String(height)}`}
      preserveAspectRatio="none"
      className={cn('h-8 w-full', className)}
      aria-hidden
    >
      <path d={area} className="fill-current opacity-10" stroke="none" />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
