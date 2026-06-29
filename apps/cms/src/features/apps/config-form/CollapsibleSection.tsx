import { ChevronRightIcon } from 'lucide-react'
import { type ReactNode, useId, useState } from 'react'

import { cn } from '@/lib/utils'

interface CollapsibleSectionProps {
  title: string
  /** Open on first render. Named config sections default to collapsed. */
  defaultOpen?: boolean
  children: ReactNode
}

/**
 * A titled, collapsible group of config fields. Used for every section after the
 * first (the first section is always-open and untitled). Collapsed by default so
 * apps with many fields stay tidy; the operator expands what they need.
 */
export function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const contentId = useId()

  return (
    <div className="border-secondary border-t pt-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => {
          setOpen((prev) => !prev)
        }}
        className="flex w-full items-center gap-2 text-left text-sm font-semibold text-primary"
      >
        <ChevronRightIcon
          className={cn(
            'size-4 shrink-0 text-secondary transition-transform',
            open && 'rotate-90',
          )}
        />
        {title}
      </button>

      {open ? (
        <div id={contentId} className="mt-4">
          {children}
        </div>
      ) : null}
    </div>
  )
}
