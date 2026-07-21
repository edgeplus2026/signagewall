import { CheckIcon, ChevronsUpDownIcon, Loader2Icon, SearchIcon } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface ComboboxOption {
  label: string
  value: string
  /**
   * Optional group heading. When any option carries a group, the list renders
   * options under their group's heading (e.g. cities grouped by country). The
   * group text is also matched by the local search.
   */
  group?: string
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
  /**
   * Cap the number of rendered rows (large datasets like world cities). When the
   * filtered set exceeds it, the extra rows are hidden behind a "keep typing"
   * hint. Omit for no cap (short lists render whole).
   */
  maxResults?: number | undefined
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
  maxResults,
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
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) ||
        (option.group?.toLowerCase().includes(q) ?? false),
    )
  }, [isAsync, options, query])

  // Cap huge result sets so the popover stays fast; the hidden remainder is
  // surfaced as a "keep typing" hint below the list.
  const visible = useMemo(
    () =>
      maxResults && filtered.length > maxResults
        ? filtered.slice(0, maxResults)
        : filtered,
    [filtered, maxResults],
  )
  const hiddenCount = filtered.length - visible.length

  return (
    <Popover
      modal
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
          {visible.length === 0 ? (
            <p className="text-secondary px-2 py-4 text-center text-sm">
              {loading ? '…' : emptyLabel}
            </p>
          ) : (
            <>
              {visible.map((option, index) => {
                const showGroupHeader =
                  option.group !== undefined &&
                  option.group !== visible[index - 1]?.group
                return (
                  <Fragment key={option.value}>
                    {showGroupHeader ? (
                      <div className="text-secondary px-2 pt-2 pb-1 text-xs font-medium">
                        {option.group}
                      </div>
                    ) : null}
                    <button
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
                  </Fragment>
                )
              })}
              {hiddenCount > 0 ? (
                <p className="text-secondary px-2 pt-2 pb-1.5 text-center text-xs">
                  +{hiddenCount} more — keep typing to narrow the list
                </p>
              ) : null}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
