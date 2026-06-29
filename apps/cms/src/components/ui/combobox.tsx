import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface ComboboxOption {
  label: string
  value: string
}

interface ComboboxProps {
  value: string
  options: ComboboxOption[]
  onChange: (value: string) => void
  onBlur?: (() => void) | undefined
  id?: string | undefined
  placeholder?: string | undefined
  searchPlaceholder?: string | undefined
  emptyLabel?: string | undefined
  disabled?: boolean | undefined
  'aria-invalid'?: boolean | undefined
  'aria-label'?: string | undefined
  className?: string | undefined
}

export function Combobox({
  value,
  options,
  onChange,
  onBlur,
  id,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  disabled,
  'aria-invalid': ariaInvalid,
  'aria-label': ariaLabel,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selectedLabel = useMemo(
    () => options.find((option) => option.value === value)?.label,
    [options, value],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((option) => option.label.toLowerCase().includes(q))
  }, [options, query])

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
          <span className={cn('truncate', !selectedLabel && 'text-secondary')}>
            {selectedLabel ?? placeholder}
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
            filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                  setQuery('')
                }}
                className="hover:bg-highlight flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors"
              >
                <CheckIcon
                  className={cn(
                    'size-4 shrink-0',
                    option.value === value ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <span className="truncate">{option.label}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
