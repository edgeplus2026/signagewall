'use client'

import { useId, useState } from 'react'

import { Card } from '@/components/ui/card'

/**
 * Screens in, cost out.
 *
 * The point is not arithmetic — anyone can multiply by eight. It is that a
 * buyer with 40 screens sees the real monthly figure without doing it in their
 * head and without asking for a quote, which is the whole argument for
 * publishing a price at all.
 *
 * `unitPrice` arrives from `lib/pricing`; this component never knows the number.
 */
export function PricingCalculator({
  unitPrice,
  locale,
  currency,
  labels,
}: {
  unitPrice: number
  locale: string
  currency: string
  labels: { screens: string; monthly: string; yearly: string }
}) {
  const [screens, setScreens] = useState(10)
  const id = useId()

  const money = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  })

  return (
    <Card className="grid gap-10 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <label htmlFor={id} className="flex items-baseline justify-between gap-4">
          <span className="text-sm text-secondary">{labels.screens}</span>
          <span className="font-heading text-3xl font-semibold tabular-nums">{screens}</span>
        </label>
        {/* A range input rather than a number field: the interesting question is
            "roughly what does a network my size cost", not an exact count. */}
        <input
          id={id}
          type="range"
          min={1}
          max={200}
          value={screens}
          onChange={(e) => {
            setScreens(Number(e.target.value))
          }}
          className="accent-accent mt-5 h-1 w-full cursor-pointer appearance-none bg-rule"
        />
        <div className="mt-2 flex justify-between text-xs text-secondary tabular-nums">
          <span>1</span>
          <span>200</span>
        </div>
      </div>

      <div className="flex gap-10 md:flex-col md:gap-6 md:border-l md:border-secondary md:pl-10">
        <p>
          <span className="block font-heading text-4xl font-semibold tracking-tight tabular-nums">
            {money.format(screens * unitPrice)}
          </span>
          <span className="mt-1 block text-sm text-secondary">{labels.monthly}</span>
        </p>
        <p>
          <span className="block font-heading text-2xl font-semibold tracking-tight text-secondary tabular-nums">
            {money.format(screens * unitPrice * 12)}
          </span>
          <span className="mt-1 block text-sm text-secondary">{labels.yearly}</span>
        </p>
      </div>
    </Card>
  )
}
