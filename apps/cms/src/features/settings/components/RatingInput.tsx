import { StarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

const MAX_RATING = 5

interface RatingInputProps {
  value: number
  onChange: (value: number) => void
  id?: string
}

export function RatingInput({ value, onChange, id }: RatingInputProps) {
  return (
    <div
      id={id}
      role="radiogroup"
      aria-label="Rating"
      className="flex items-center gap-1"
    >
      {Array.from({ length: MAX_RATING }, (_, index) => {
        const star = index + 1
        const isActive = star <= value

        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={String(star)}
            onClick={() => {
              onChange(star)
            }}
            className="text-secondary rounded-sm transition-colors hover:opacity-80"
          >
            <StarIcon
              className={cn(
                'size-7',
                isActive
                  ? 'fill-warning text-warning'
                  : 'fill-transparent text-secondary',
              )}
            />
          </button>
        )
      })}
    </div>
  )
}
