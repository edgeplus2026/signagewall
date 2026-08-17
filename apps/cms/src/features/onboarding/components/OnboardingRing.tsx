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
          // Raw var: the theme exposes borders only through the border
          // namespace, so a plain `stroke-secondary` would silently resolve to
          // nothing.
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
          // Success green throughout, not only at 100%: progress here is
          // always good news, and the brand ink reads as plain white on dark.
          className="stroke-success transition-[stroke-dashoffset] duration-500 ease-out"
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
