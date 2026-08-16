import type { FieldControlProps } from '@/features/apps/config-form/controls'
import { cn } from '@/lib/utils'

/**
 * A `select` marked `buttonGroup`, rendered as a segmented control.
 *
 * For the handful of selects whose value is a MODE rather than a value — "items
 * come from a manual table / Google Sheets / Excel" — where the alternatives
 * decide what the rest of the form even shows. A dropdown hides them behind a
 * click and reads as a setting; three buttons read as a switch and make the
 * choice legible without opening anything.
 *
 * Wraps rather than scrolls: the config sidebar is ~384px, and three labels do
 * not fit on one line there. Two lines of buttons beat a hidden third option.
 */
export function ButtonGroupControl({
  field,
  id,
  value,
  onChange,
  onBlur,
  invalid,
  disabled,
}: FieldControlProps) {
  const options = field.options ?? []
  const selected = typeof value === 'string' ? value : ''

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={field.label}
      aria-invalid={invalid}
      className={cn(
        'flex flex-wrap gap-1 rounded-lg border border-secondary bg-sidebar p-1',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      {options.map((option) => {
        const isSelected = option.value === selected

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled ?? false}
            onClick={() => {
              onChange(option.value)
              onBlur()
            }}
            className={cn(
              'flex-1 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
              'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-tertiary/50',
              isSelected
                ? 'bg-panel text-primary shadow-sm'
                : 'text-secondary hover:text-primary',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
