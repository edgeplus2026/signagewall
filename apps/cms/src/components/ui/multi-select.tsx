import { ChevronsUpDownIcon, SearchIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface MultiSelectOption {
  label: string
  value: string
}

interface MultiSelectProps {
  value: string[]
  options: MultiSelectOption[]
  onChange: (value: string[]) => void
  onBlur?: (() => void) | undefined
  id?: string | undefined
  placeholder?: string | undefined
  searchPlaceholder?: string | undefined
  emptyLabel?: string | undefined
  disabled?: boolean | undefined
  /** Hard cap: once this many are selected, unchecked options can't be added. */
  maxSelected?: number | undefined
  'aria-invalid'?: boolean | undefined
  'aria-label'?: string | undefined
  className?: string | undefined
}

export function MultiSelect({
  value,
  options,
  onChange,
  onBlur,
  id,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  disabled,
  maxSelected,
  'aria-invalid': ariaInvalid,
  'aria-label': ariaLabel,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selectedLabels = useMemo(
    () =>
      options
        .filter((option) => value.includes(option.value))
        .map((option) => option.label),
    [options, value],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((option) => option.label.toLowerCase().includes(q))
  }, [options, query])

  const atCap = maxSelected !== undefined && value.length >= maxSelected

  const toggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((entry) => entry !== optionValue))
      return
    }
    if (atCap) return
    onChange([...value, optionValue])
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setQuery('')
          onBlur?.()
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn('h-9 w-full justify-between gap-2 font-normal', className)}
        >
          <span className={cn('truncate', selectedLabels.length === 0 && 'text-secondary')}>
            {selectedLabels.length === 0
              ? placeholder
              : selectedLabels.length <= 2
                ? selectedLabels.join(', ')
                : `${String(selectedLabels.length)} selected`}
          </span>
          <ChevronsUpDownIcon className="text-secondary size-4 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <div className="border-quaternary flex items-center gap-2 border-b px-2.5">
          <SearchIcon className="text-secondary size-4 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
            }}
            placeholder={searchPlaceholder}
            className="text-primary placeholder:text-secondary h-9 w-full bg-transparent text-sm outline-none"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="text-secondary px-2 py-4 text-center text-sm">{emptyLabel}</p>
          ) : (
            filtered.map((option) => {
              const checked = value.includes(option.value)
              const blocked = !checked && atCap
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={blocked}
                  onClick={() => {
                    toggle(option.value)
                  }}
                  className={cn(
                    'hover:bg-highlight flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                    blocked && 'cursor-not-allowed opacity-40 hover:bg-transparent',
                  )}
                >
                  <Checkbox checked={checked} className="pointer-events-none" tabIndex={-1} />
                  <span className="truncate">{option.label}</span>
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
