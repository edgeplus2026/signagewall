import { CheckIcon, ChevronsUpDownIcon, Loader2Icon, SearchIcon } from 'lucide-react'
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
  /**
   * Async mode: when provided, the parent owns filtering (e.g. a server search).
   * The combobox calls this on every keystroke and renders `options` as-is
   * instead of filtering locally. Pair with `loading` to show a spinner.
   */
  onSearch?: ((query: string) => void) | undefined
  loading?: boolean | undefined
  /**
   * Display label for the current `value` when it isn't in `options` (async mode
   * may not have the selected item loaded). Falls back to a matching option.
   */
  selectedLabel?: string | undefined
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
  onSearch,
  loading,
  selectedLabel: selectedLabelProp,
  'aria-invalid': ariaInvalid,
  'aria-label': ariaLabel,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const isAsync = onSearch !== undefined

  const selectedLabel = useMemo(
    () =>
      options.find((option) => option.value === value)?.label ??
      selectedLabelProp,
    [options, value, selectedLabelProp],
  )

  const filtered = useMemo(() => {
    // In async mode the parent already returns the matching options.
    if (isAsync) return options
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((option) => option.label.toLowerCase().includes(q))
  }, [isAsync, options, query])

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          // Async mode: prime the initial list on open (empty query).
          onSearch?.('')
        } else {
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
          {loading ? (
            <Loader2Icon className="text-secondary size-4 shrink-0 animate-spin" />
          ) : (
            <SearchIcon className="text-secondary size-4 shrink-0" />
          )}
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              const next = event.target.value
              setQuery(next)
              onSearch?.(next)
            }}
            placeholder={searchPlaceholder}
            className="text-primary placeholder:text-secondary h-9 w-full bg-transparent text-sm outline-none"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="text-secondary px-2 py-4 text-center text-sm">
              {loading ? '…' : emptyLabel}
            </p>
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
