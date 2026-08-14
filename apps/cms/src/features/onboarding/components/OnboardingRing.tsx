import { CheckIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

interface OnboardingRingProps {
  /** 0–100. */
  percent: number
  /** Rendered diameter in pixels. */
  size?: number
  className?: string
}

/**
 * The progress dial. Stroke width and radius are derived from `size` so the
 * same component reads correctly at header scale and at panel scale.
 */
export function OnboardingRing({ percent, size = 18, className }: OnboardingRingProps) {
  const stroke = Math.max(2, Math.round(size / 9))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(100, Math.max(0, percent))
  const complete = clamped >= 100

  return (
    <span
      className={cn('relative inline-flex shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${String(size)} ${String(size)}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          // Raw vars: the theme exposes brand and border only through the text,
          // border and background namespaces, so a plain `stroke-brand` would
          // silently resolve to nothing.
          className="stroke-(--border-primary)"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          // Start the arc at 12 o'clock rather than 3 o'clock.
          transform={`rotate(-90 ${String(size / 2)} ${String(size / 2)})`}
          className={cn(
            'transition-[stroke-dashoffset] duration-500 ease-out',
            complete ? 'stroke-success' : 'stroke-(--brand)',
          )}
        />
      </svg>
      {complete ? (
        <CheckIcon
          className="text-success absolute inset-0 m-auto"
          style={{ width: size * 0.5, height: size * 0.5 }}
        />
      ) : null}
    </span>
  )
}
