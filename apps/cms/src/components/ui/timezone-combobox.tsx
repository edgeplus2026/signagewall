import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface TimezoneComboboxProps {
  value: string
  options: string[]
  onChange: (value: string) => void
  searchPlaceholder?: string
  emptyLabel?: string
  'aria-label'?: string
  className?: string
}

function formatZone(tz: string): string {
  return tz.replace(/_/g, ' ')
}

export function TimezoneCombobox({
  value,
  options,
  onChange,
  searchPlaceholder,
  emptyLabel,
  'aria-label': ariaLabel,
  className,
}: TimezoneComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  // Ensure the current value is always selectable even if it's absent from the
  // browser's enumerated zone list (e.g. a deprecated alias saved elsewhere).
  const allOptions = useMemo(
    () => (value && !options.includes(value) ? [value, ...options] : options),
    [value, options],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allOptions
    return allOptions.filter((tz) => tz.toLowerCase().includes(q))
  }, [allOptions, query])

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery('')
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className={cn('justify-between gap-2 font-normal', className)}
        >
          <span className="truncate">{value ? formatZone(value) : ''}</span>
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
            filtered.map((tz) => (
              <button
                key={tz}
                type="button"
                onClick={() => {
                  onChange(tz)
                  setOpen(false)
                  setQuery('')
                }}
                className="hover:bg-highlight flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none"
              >
                <CheckIcon
                  className={cn('size-4 shrink-0', tz === value ? 'opacity-100' : 'opacity-0')}
                />
                <span className="truncate">{formatZone(tz)}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
